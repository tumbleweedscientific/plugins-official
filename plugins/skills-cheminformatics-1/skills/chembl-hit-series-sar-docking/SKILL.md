---
name: chembl-hit-series-sar-docking
description: 'Triage the known ChEMBL hits for any protein target: score by potency and efficiency, cluster into chemical series, run within-series SAR (MCS, R-groups), dock representative ligands with Vina, emit a PDF report plus an interactive HTML data appendix. Starts from experimental ChEMBL bioactivity, not a compound library and not an assay-interference screen. Triggers: hit triage, hit expansion, screening hits, chemical series, SAR, target-based triage.'
metadata:
  tumbleweed:
    domains:
    - medicinal-chemistry
    - docking
    - cheminformatics
    tags:
    - chembl-hit-series-sar-docking
    - cheminformatics
    maturity: stable
    citations: []
    starterPrompts:
    - 'Triage small-molecule screening hits against EGFR from ChEMBL: score by potency, cluster into series, run SAR, dock representative ligands, and tell me which series are worth expanding.'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - matplotlib
      - meeko
      - numpy
      - openbabel
      - pandas
      - pillow
      - pypdf
      - python
      - r-base
      - rdkit
      - scipy
      - seaborn
      - vina
      dataSources:
      - chembl
      - pdb
      - uniprot
      models: []
      scienceModels: []
      credentials: []
      longRunning: true
      image: bioinfo
      resourceClass: large
      network:
      - ccsb.scripps.edu
      - data.rcsb.org
      - files.rcsb.org
      - github.com
      - search.rcsb.org
      - www.ebi.ac.uk
      - www.rcsb.org
    inputs:
    - csv
    - json
    - pdb
    - smiles
    - pdf
    - png
    outputs:
    - report
    - csv
    - json
    - png
    title: ChEMBL Hit Series SAR Docking
license: Apache-2.0
---

# ChEMBL Hit Triage, SAR & Docking

Turn a protein target name or ChEMBL target ID into a prioritized, series-aware
hit-expansion report. Retrieve bioactivity from ChEMBL, score hits by potency
and efficiency, cluster into chemical series, run SAR within each series, dock
representative ligands into a relevant PDB structure, and deliver an interactive
Phylo-branded PDF report (the primary deliverable) plus an interactive HTML data appendix.

## When to Use This Skill

**Use this skill when** you have a **protein target** (a name/synonym, a UniProt accession, or a
ChEMBL target ID) and want to triage its **known ChEMBL hits**: score them by potency and efficiency,
cluster them into chemical series, run within-series SAR, dock representative ligands into a relevant
PDB structure, and get a ranked, series-aware "which series are worth expanding" answer.

**Supported inputs (routes):**

- A **target identifier** → the skill resolves it against ChEMBL and retrieves experimental bioactivity.
- Your **own bioactivity CSV** (`smiles`, `standard_value`, `standard_type`, `molecule_id`) → the
  skill skips ChEMBL retrieval and proceeds from scoring; it fails loudly on missing columns and never
  fabricates input data.
- Optional: PDB override (`--pdb-id`/`--pdb-file`), assay-variant filter, and scoring/clustering
  thresholds (see Inputs).

**Outputs:** a Phylo-branded PDF report (primary), an interactive HTML data appendix, and the
underlying CSV/JSON artifacts — scored/clustered hits with variant provenance, docking results,
variant composition, SAR results, and docking-box provenance (see Outputs).

**Do NOT use this skill when** (use the named skill instead):

- you have a **single compound** and want its potency/selectivity across targets → `drug-bioactivity-chembl`
- you have a **compound library** (SMILES/CSV) to dock or screen at scale → `large-scale-virtual-screening`
- you need to judge whether a hit is a **real signal or an assay artefact** → `screen-hit-triage-interference`
- you need **quantitative activity-cliff / matched-molecular-pair** statistics → `matched-molecular-pairs`
- you want to **predict potency**, run **MD or free-energy** calculations, confirm binding
  experimentally, profile selectivity across many targets, or synthesize compounds — all out of scope.
  This skill uses only experimental ChEMBL potency and treats docking as structural plausibility, not
  affinity prediction.

## Scope

**Does:** resolve a ChEMBL target from a name/UniProt ID → pull bioactivity
records (IC50/Ki/Kd/EC50) → standardize to pChEMBL → score hits (potency +
ligand/lipophilic efficiency + drug-likeness) → tier hits → Butina cluster into
chemical series → SAR per series (Murcko scaffold, MCS, property-potency
correlations, R-group decomposition, plus a **coarse activity-cliff flag**) →
select representative ligands → dock with AutoDock Vina against a user-specified
or auto-selected PDB structure → generate 10 figures → produce an interactive
HTML report with sortable tables and embedded figures → produce a PDF report via
ReportLab.

**Does NOT:** predict potency (all potency is experimental ChEMBL data); run
free-energy perturbation or MD; confirm binding experimentally; perform
selectivity profiling across targets (use `drug-bioactivity-chembl` for that);
run large-scale virtual screening of external libraries (use
`large-scale-virtual-screening` for that); screen hits for assay interference or
promiscuity (use `screen-hit-triage-interference`); perform quantitative
activity-cliff or matched-molecular-pair analysis (use
`matched-molecular-pairs`); or synthesize compounds.

**Activity cliffs — this skill is not the authority.** The per-series cliff flag
here is a coarse orientation aid only. Cliff counts are extremely sensitive to the
similarity criterion — on one dataset the same pairs yielded 0.13 % under a
Tanimoto-only rule versus 6.04 % under a consensus rule. Quantitative cliff work
belongs in `matched-molecular-pairs`, which reports counts under every criterion
with the criterion named. **Never present this skill's cliff flag as a cliff
statistic**, and never let it contradict an MMP report.

## Boundary with existing skills

| Existing skill                     | What it does                                                                                                                   | Boundary                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drug-bioactivity-chembl`        | Compound-centric potency + selectivity profiling from ChEMBL                                                                   | **Compound → many targets.** This skill is **target → many compounds** with series clustering, SAR, and docking.                                                                                                                                                                                 |
| `large-scale-virtual-screening`  | Dock a library (ChEMBL/DUD-E/user SMILES) with Vina, enrichment benchmarking, triage + SAR                                     | **Library → docking scores → triage.** This skill starts from ChEMBL bioactivity (experimental potency), adds series-level SAR with MCS/R-groups, and docks only representative ligands -- not a full library screen. Reuse its docking scripts for the docking step if a full-scale screen is needed. |
| `screen-hit-triage-interference` | Flags whether an apparent hit is an assay artefact -- frequent-hitter/promiscuity prediction and demerit-scored reactivity     | **Is this hit real?** vs **which of these real hits should I expand?** That skill judges trustworthiness of the signal; this one assumes the potency is real and organises it into series. They compose: run interference triage first, then bring the surviving hits here.                        |
| `matched-molecular-pairs`        | Quantitative MMP transformations and activity cliffs, with bootstrap CIs, support thresholds and per-criterion cliff reporting | **Authority for cliffs and transformation statistics.** This skill's per-series cliff flag is a coarse orientation aid only and must never be reported as a cliff statistic. Hand any quantitative SAR-transformation or cliff question to that skill.                                                   |

**When to use this skill vs. others:**

- User has a **target** and wants to triage known hits → **this skill**
- User has a **compound** and wants its potency/selectivity profile → `drug-bioactivity-chembl`
- User has a **library** (SMILES/CSV) and wants to dock it → `large-scale-virtual-screening`
- User asks whether hits are **real or assay artefacts** → `screen-hit-triage-interference`
- User wants **how a structural change shifts potency**, or real cliff numbers → `matched-molecular-pairs`

## Inputs

### Required

- **Target identifier** — one of:
  - ChEMBL target ID (`CHEMBLxxxx`)
  - Protein name or synonym (e.g. "TYK2", "EGFR", "BRAF")
  - UniProt accession (e.g. "P29597") — used for both ChEMBL target resolution and PDB structure search

### Optional (with defaults)

| Parameter               | Default                                        | Accepted values                                                         | Notes                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `potency_types`       | `IC50,Ki,Kd,EC50,AC50,Potency`               | Comma-separated ChEMBL `standard_type` values                         | pIC50/pKi/pKd are auto-converted                                                                                                                                                                                                                                    |
| `relation_filter`     | `exact_only`                                 | `exact_only`, `include_bounds`                                      | `exact_only` keeps `=` records only; `include_bounds` also keeps `>`/`<` as censored bounds                                                                                                                                                               |
| `pchembl_min`         | `5.0` (10 µM)                               | float                                                                   | Minimum pChEMBL to include as a hit                                                                                                                                                                                                                                 |
| `pchembl_max`         | `11.0` (0.001 nM)                            | float                                                                   | Maximum pChEMBL (sanity ceiling)                                                                                                                                                                                                                                    |
| `variant`             | `any`                                        | `any`, `WT`, or a mutation string (e.g. `L858R`, `L858R,T790M`) | Restrict scoring to one assay variant (`process_activities.py`). Default keeps all variants but reports the composition and warns about pooling; it is never silent. A named/WT selector fails loudly, listing available variants, if nothing matches.            |
| `butina_cutoff`       | `0.40` (Tanimoto distance = 0.60 similarity) | float 0–1                                                              | Butina clustering distance cutoff                                                                                                                                                                                                                                   |
| `min_series_size`     | `5`                                          | int                                                                     | Minimum cluster size to label as a named series                                                                                                                                                                                                                     |
| `top_n_series_sar`    | `20`                                         | int                                                                     | Number of top series to run full SAR on                                                                                                                                                                                                                             |
| `dock_top_per_series` | `3`                                          | int                                                                     | Representative ligands per series for docking                                                                                                                                                                                                                       |
| `dock_top_overall`    | `10`                                         | int                                                                     | Additional top hits by potency for docking                                                                                                                                                                                                                          |
| `pdb_id`              | auto-select                                    | PDB ID string                                                           | Override auto-selection; must contain a co-crystal ligand                                                                                                                                                                                                           |
| `receptor_variant`    | auto                                           | string (e.g. `WT`, `L858R`)                                         | Declares which variant the docked structure represents (`prepare_docking.py --receptor-variant`); recorded in `docking_box.json` and surfaced in reports. Auto = RCSB annotation (`pdbx_mutation`, or `mutation_count==0` → `WT`), else `unspecified`. |
| `vina_exhaustiveness` | `16`                                         | int                                                                     | Vina exhaustiveness parameter                                                                                                                                                                                                                                       |
| `vina_seed`           | `42`                                         | int                                                                     | Random seed for reproducibility                                                                                                                                                                                                                                     |
| `organism`            | `Homo sapiens`                               | string                                                                  | Filter ChEMBL targets by organism                                                                                                                                                                                                                                   |
| `target_type`         | `SINGLE PROTEIN`                             | string                                                                  | Filter ChEMBL target type                                                                                                                                                                                                                                           |

### User-supplied data (alternative to ChEMBL retrieval)

A caller may supply their own bioactivity table as a CSV with at minimum:

- `smiles` (canonical SMILES)
- `standard_value` (numeric potency in nM)
- `standard_type` (IC50, Ki, Kd, etc.)
- `molecule_id` (any identifier)

When user data is supplied, the skill **skips ChEMBL retrieval** and proceeds
from scoring onward. The skill **fails loudly** if required columns are missing
-- it never fabricates input data or silently falls back to a built-in example.

## Outputs (all to `/workspace/results/`)

| File                                                                     | Description                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report_<target>_hit_triage.pdf` (e.g. `report_EGFR_hit_triage.pdf`) | **Primary deliverable.** Phylo-branded PDF assembled by ReportLab (intro, methods, results, conclusions, figures, references, next steps)                                     |
| `<target>_hit_triage_report.html`                                      | **Interactive data appendix.** Self-contained HTML with embedded figures and sortable/filterable hit tables — for exploring the full hit list, which a PDF cannot do. Not the primary report |
| `<target>_hits_scored_clustered.csv`                                   | Full hit table with scores, tiers, cluster IDs, series labels, and variant columns (`variant_best`, `variant_summary`, `n_variants`, `assay_variant_accession`)                             |
| `<target>_docking_results.csv`                                         | Per-ligand docking scores with experimental potency **and the assay variant** each potency came from                                                                                          |
| `variant_composition.json`                                             | Per-variant record/molecule counts and percentages (WT/unspecified as its own bucket), the pooling flag, and the applied `--variant` filter                                                       |
| `<target>_sar_results.json`                                            | Per-series SAR: MCS, Murcko scaffold, activity cliffs, correlations, R-groups, recommendations                                                                                                      |
| `<target>_series_stats.csv`                                            | Per-series summary statistics, including the per-series variant mix (`n_variants_in_series`, `dominant_variant`)                                                                                |
| `docking_box.json`                                                     | Docking box + `pdb_selection` provenance + `receptor_variant`                                                                                                                                   |
| `figures/`                                                             | 10 figures as PNG; 9 also as SVG (fig8 structure grid is raster-only). All 10 are embedded in the HTML report.                                                                                      |

## Figures

All 10 figures are produced by `scripts/generate_figures.py` (step 7), embedded in the interactive
HTML appendix (step 8), and passed to the delegated PDF (step 9). Both reports read their figure list
from the run's `'figures'` directory (the files below); 9 are also written as SVG (fig8 is
raster-only). Captions state what each figure shows, not what it is called.

| Step | File                                         | What it shows                                                                                                     |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 7    | `figures/fig1_potency_distribution.png`    | pChEMBL potency distribution and hit-tier counts                                                                  |
| 7    | `figures/fig2_series_overview.png`         | chemical series ranked by mean hit score                                                                          |
| 7    | `figures/fig3_chemical_space.png`          | 2D chemical space of the hit set                                                                                  |
| 7    | `figures/fig4_docking_vs_potency.png`      | docking score vs experimental pChEMBL, with the honest Pearson r/p (labelled not-significant when it is)          |
| 7    | `figures/fig5_series_potency_boxplots.png` | potency distribution across the top series                                                                        |
| 7    | `figures/fig6_sar_correlations.png`        | within-series property-potency correlations                                                                       |
| 7    | `figures/fig7_le_lipe.png`                 | ligand efficiency vs lipophilic efficiency                                                                        |
| 7    | `figures/fig8_top_hit_structures.png`      | 2D structure grid of the top hits (raster-only)                                                                   |
| 7    | `figures/fig9_series_recommendations.png`  | series EXPAND/EXPLORE/MONITOR/DROP recommendations                                                                |
| 7    | `figures/fig10_docking_by_series.png`      | docking-score distribution across the top series (subset to the top-N so it stays legible on high-series targets) |

## Detailed Reference & Caveats

For complete step-by-step code recipes, decision tables, error handling, and scientific caveats, see [references/detailed_reference.md](references/detailed_reference.md).
