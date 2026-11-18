# Environment Resources Used by This Skill

Everything this skill needs is in the sandbox image or reachable over public REST APIs.
Verify required packages directly at runtime (`importlib.util.find_spec`).

## Databases

- **RCSB PDB** — source of all co-crystal coordinates and ligand/entry metadata,
  accessed via the public REST and search endpoints in `fetch_structure.py`:
  - coordinates: `files.rcsb.org/download/{PDB}.pdb`
  - entry metadata: `data.rcsb.org/rest/v1/core/entry/{PDB}`
  - ligand chem-comp: `data.rcsb.org/rest/v1/core/chemcomp/{CODE}`
  - text/chem search: `search.rcsb.org/rcsbsearch/v2/query`

## Literature

- **Literature search** — used in Step 3 to ground the pocket in real, cited literature.
  Use the `pubmed-database`, `literature-search-europepmc` or `literature-search-openalex`
  skills (or `web_search`), and pass the returned records (title, authors, journal, year,
  DOI/PMID) into the report. **Never fabricate citations.**

## Preinstalled packages

Python (all present in the sandbox image):
- **biopython** — structure parsing + heavy-atom geometry (contacts, H-bonds).
- **numpy** — vectorized distance matrices.
- **rdkit** — ligand bond perception and fragment/functional-group assignment.
- **matplotlib** — the 2D data figures (interaction diagram, distance chart, heatmap)
  and the 3D fallback.
- **reportlab** — the PDF report.
- **pypdf** — PDF validation.
- **pillow** (PIL) — image sizing for figure embedding.

CLI / other:
- **PyMOL** (pymol-open-source) — publication-quality 3D pocket render (`pymol -c`);
  optional, with a matplotlib fallback.
- **AutoDock Vina** (`vina`) — suggested next step for docking analogs.

## Suggested next steps (other skills)

- `admet-prediction` — predicted ADMET for the ligand (from its RCSB SMILES); needs a GPU backend.
- `cheminformatics-core` / `med-chem-filters` — rule-based properties and structural alerts.

## Deliberately NOT used

- No GPU tools are required (structure prediction, docking, MD are *next steps*, not
  part of contact mapping).
- No local datasets are needed — the analysis is driven entirely by the supplied
  structure and RCSB metadata.

## How to re-check availability

```python
from importlib.util import find_spec
assert find_spec("rdkit") and find_spec("Bio") and find_spec("reportlab")
```
If a resource is missing, install it in the sandbox (`python3 -m pip install ...` or
`micromamba install -c conda-forge ...`).
