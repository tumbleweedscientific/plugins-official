# Troubleshooting

Concrete failures seen while building/running this skill, and the fix. Most are **silent** —
they produce a plausible-looking wrong answer rather than an error — so each script has a
`--self-check` that guards the fragile part.

## Environment / install

- **`ModuleNotFoundError: vina` / `meeko`** on a fresh worker. The Vina *CLI*
  (`/usr/local/bin/vina`, v1.2.5) and ADFR `prepare_receptor`/`prepare_ligand` are present,
  but the Python bindings are not. Fix: `python3 -m pip install vina meeko gemmi`.
- **`ModuleNotFoundError: meeko` even though `python3 -m pip install` reported success.** The base
  image has a `/workspace/.venv` whose `bin/python` is a symlink to the sandbox toolchain interpreter, so a
  bare `python3 -m pip install ...` can install into `.venv/lib/.../site-packages` while your scripts
  actually import from the sandbox environment (or vice-versa) — the package is installed, just not on
  the importing interpreter's path. **Fix: pin both sides to the same interpreter** — install
  with `python3 -m pip install ...` and invoke scripts with
  `/opt/conda/bin/python <script>.py`. Do not rely on a bare `python`.
- **`ModuleNotFoundError: gemmi` when meeko prepares a ligand.** meeko 0.7.x imports gemmi
  lazily, so it installs fine but fails at runtime. Always install **gemmi alongside meeko**.
- **`prepare_receptor: command not found`.** It lives in `/usr/local/bin` and sandbox toolchain tools in
  `/opt/conda/bin`. Every subprocess must run with
  `PATH=/opt/conda/bin:/usr/local/bin:$PATH` (subprocess env does not inherit an interactive
  PATH). Fallbacks if ADFR is truly absent: `mk_prepare_receptor.py` (meeko) or
  `obabel rec.pdb -O rec.pdbqt -xr -p 7.4`.

## Pose validation (redock)

- **RMSD atom-count mismatch (e.g. "31 vs 33").** Converting a docked PDBQT back to PDB with
  obabel re-perceives bonds and adds/removes hydrogens, so RDKit template matching against the
  crystal ligand fails. **Fix (what this skill does):** never round-trip through obabel for
  RMSD. Read **heavy-atom coordinates directly from the PDBQT in file order** (the redock input
  and output share atom order because they come from the same molecule), and apply
  RDKit-derived **automorphisms** for symmetry. This is in `common.py`
  (`pdbqt_heavy_coords`, `symmetric_rmsd`).
- **Redock RMSD looks terrible (>3 A) but the pose is actually right.** A flexible,
  solvent-exposed tail dominates whole-molecule RMSD. Use the **core-aware** criterion
  (`redock_validate.py`): it also scores the rigid/buried core and passes if that is < 2 A.
  In the EGFR example whole-molecule was 3.22 A but the core was 0.33 A — a good pose.
- **Redock genuinely fails.** Wrong box, wrong protonation, wrong receptor, or a real
  limitation of the pose model. The gate **warns, never hard-fails** (exits 0, records
  `passed:false`); the report must surface it under Limitations rather than pretending the
  screen is validated.

## The silent-drop class (why parsers are guarded)

- **ADMET columns from another tool look empty.** When merging model-based ADMET output (for
  example from the `admet-prediction` skill) into the top-N table, check its return shape first:
  a text report, a DataFrame and a dict need different parsing, and assuming the wrong one
  **silently drops every compound**. `admet_annotate.py` itself only adds RDKit rule flags and
  its `--self-check` asserts they are computed. **Lesson:** never assume a tool's return
  shape — probe it, parse defensively, and assert a known value survives.
- **Enrichment metrics.** Hand-rolled BEDROC/EF are easy to get subtly wrong. Use RDKit's
  `rdkit.ML.Scoring.Scoring` and feed rows sorted **best→worst** with the label in column 0.
  The self-check runs a tiny labeled set and asserts a non-degenerate AUC.

## FUSE / filesystem

- **`PermissionError` / `OSError` writing to `/workspace/results` or `/workspace`.**
  These are S3-backed FUSE mounts with no random-access/append/streaming writes. Do the work
  on local `/workspace`, then a single shell `cp` to `/mnt/...`.
- **0-byte files on `/mnt/...`.** R's `file.copy()` (and some Python buffered copies) produce
  empty files here. Use a shell `cp`. The helper `fuse_safe_copy` in `common.py` picks shell
  `cp` for `/mnt/` destinations automatically.
- **`rm -rf` on a `/mnt` directory hangs or errors; recursive `find` is very slow/blocked.**
  Avoid both on FUSE; operate per-file or per-directory, or work under `/workspace`.

## Scaling / throughput

- **A big screen crawls.** The default `worker-0` is a minimal-footprint, autoscaling
  ~1-CPU machine. Provision real workers with `ManageMachine` for anything beyond a few
  hundred ligands (see `compute_and_scaling.md`).
- **Load average shows 0.00 while docking.** These machines misreport load average — it is
  not a reliable "is it busy?" signal. Count actual Vina processes with
  `ps -eo comm | grep -c vina` and watch produced score rows instead.
- **A worker dies mid-screen.** Shards are independent CSVs, so re-run only the missing
  shard(s); `--mode collect` merges whatever shard files are present. Checkpoint shard CSVs
  to `/workspace/` so a lost machine doesn't lose completed work (sandboxes hard-die
  at ~24 h).

## Library acquisition

- **ChEMBL / DUD-E / datalake unreachable or empty.** The library builder degrades
  gracefully and states the fallback used; if a source returns nothing it errors clearly
  rather than silently producing a 0-row library. Always confirm `master_library.csv` row
  count and that `activity_label` is populated as expected before docking.
