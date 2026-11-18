---
name: cheminformatics-ml
description: 'Trains, benchmarks, and evaluates predictive SAR and QSAR/ADMET models for chemical series: small-N regularized regressors, nested cross-validation, Tukey HSD model tiering, scaffold/temporal splitting, matched molecular pairs (MMPA), similarity attribution maps, model persistence, and candidate scoring.'
metadata:
  tumbleweed:
    domains:
    - cheminformatics
    - admet
    - medicinal-chemistry
    tags:
    - cheminformatics-ml
    - cheminformatics
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use cheminformatics-ml: Trains, benchmarks, and evaluates predictive SAR and QSAR/ADMET models for chemical series: small-N regularized regressors, nested cross-validation, Tukey HSD model tiering, scaffold/temporal splitting, matched molecular pairs (MMPA), similarity.'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - joblib
      - matplotlib
      - numpy
      - pandas
      - python
      - r-base
      - rdkit
      - scikit-learn
      - scipy
      - seaborn
      - smina
      - tabulate
      - vina
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network: []
      skills:
      - cheminformatics-core
      - cheminformatics-physics
      - cheminformatics-reactions
      - rdkit-general
    inputs:
    - smiles
    - png
    outputs:
    - png
    title: Cheminformatics ML
license: Apache-2.0
---

# RDKit Machine Learning & Predictive SAR Hub (`cheminformatics-ml`)

## Prerequisites

1.  **`rdkit-general`**: Read the `rdkit-general` skill before running any
    workflow here.
## Core Rules

-   **Shared foundation rules**: Follow all core rules in
    `/opt/skills/rdkit-general/SKILL.md`.
-   **Complete Labeled Dataset Processing (No Downsampling)**: Train and
    evaluate across 100% of the quantitatively labeled compounds in the curated
    series; never subsample a series to a small representative subset.
-   **No ASCII Structures or Monospace Tables**: Never render chemical
    structures, scaffolds, or tables using ASCII art or monospace code blocks.
    Use `/opt/skills/rdkit-general/scripts/draw_molecules.py` or
    `/opt/skills/cheminformatics-reactions/scripts/render_mechanism.py` and format all
    tables in GitHub Flavored Markdown (GFM) (see
    `/opt/skills/rdkit-general/references/reporting_and_nomenclature_invariants.md`).
-   **Publication Visual Styling**: Never use unstyled default
    matplotlib/seaborn palettes. Use `scripts/plot_archetypes.py` or apply
    `compat.py::set_safe_plot_style()`.
-   **Interpretable Feature Attribution**: Never plot anonymous circular
    fingerprint bit hashes (`FP_\d+`, `Bit_\d+`) as named feature importance
    bars. Always attribute importance using continuous physical/2D descriptors
    (`standardized_feature_coefficients` in `--output-metrics`).
-   **Temporal Split Hygiene & Zero Time Overlap**: Never treat boolean flags
    (`False` / `True`) as chronological values (`False < True` is not a temporal
    split). Backfill true publication or patent dates (`document_year`,
    `publication_date`, `filing_date`, `priority_date`) whenever document
    provenance is available, and perform every temporal cut with an explicit
    `--time-cutoff <year_or_YYYY-MM-DD>` (`train <= cutoff`, `test > cutoff`) so
    $\max(t_{\text{train}}) < \min(t_{\text{test}})$ with zero timestamp
    overlap.

--------------------------------------------------------------------------------

## Task-to-Domain Routing Directory

Match the user's objective to the domain below, **read the corresponding
reference guide**, and execute from `scripts/`:

1.  **Small-N QSAR Benchmarking, TabFM, Splitting & Statistical Tiering**

    -   **Reference Guides**:
        -   `references/small_n_qsar_and_regularization.md` — read when training
            regularized QSAR models, running nested CV, tiering by Tukey HSD, or
            extracting standardized $\beta$ feature coefficients.
        -   `references/tabfm_molecular_modeling.md` — read when running
            zero-shot TabFM tabular foundation modeling.
        -   `references/hit_to_lead_and_sbdd.md` — read when performing
            scaffold/temporal splitting, Butina clustering, MaxMin diversity
            picking, or positional analogue scanning.
    -   **Standard Executables**:
        -   `python3 scripts/congeneric_series_ml.py` — central adaptive
            regularized QSAR benchmarking engine: builds 2D, fingerprint,
            hybrid, and TabFM representations, runs nested CV, tiers models by
            Tukey HSD, exports standardized feature $\beta$ coefficients
            (`--output-metrics`), and serializes the winning `.joblib` bundle.
        -   `python3 scripts/scaffold_splitter.py` — Bemis-Murcko scaffold and
            cutoff-based temporal partitioning
            (`--split-method time --time-cutoff <year_or_YYYY-MM-DD>`) with
            automatic true-date backfilling and zero time overlap.
        -   `python3 scripts/cluster_compounds.py` — Butina clustering on Morgan
            fingerprint Tanimoto similarity.
        -   `python3 scripts/diversity_picker.py` — MaxMin diversity selection.
        -   `python3 scripts/positional_analogue_scanner.py` — systematic
            positional analogue scanning of substituent positions.
        -   `python3 scripts/ring_system_analyzer.py` — extracts ring systems and
            frequency distributions.
        -   `python3 scripts/stereoisomer_enumerator.py` — enumerates undefined
            stereocenters and double-bond isomers.

2.  **Physics vs. ML Benchmarking, Delta-Learning & Prospective Candidate
    Scoring**

    -   **Reference Guides**:
        -   `references/prospective_scoring_and_physics_benchmarking.md` — read
            when benchmarking physics vs. ML (`--eval-split test`), calibrating
            multi-variable $\Delta$-ML, or scoring prospective analogs across
            multiple endpoints.
        -   `references/model_persistence_and_inference.md` — read when
            serializing/loading `.joblib` model bundles and checking Tanimoto
            applicability domains.
    -   **Standard Executables**:
        -   `python3 scripts/physics_ml_comparator.py` — side-by-side comparison
            of physics scoring (docking $\Delta G$, strain $\Delta
            E_{\text{strain}}$) against ML predictions (`--eval-split test`),
            fitting calibrated multi-variable $\Delta$-ML regression ($\hat{y} =
            w_0 + w_{\text{ml}}\hat{y}_{\text{ml}} + w_{\text{dock}}(-\Delta
            G_{\text{dock}}) + w_{\text{strain}}\Delta E_{\text{strain}}$).
        -   `python3 scripts/predict_potency.py` — loads a `.joblib` model bundle
            and scores novel SMILES with applicability domain validation.

3.  **Matched Molecular Pairs (MMPA), Activity Cliffs & Attribution Heatmaps**

    -   **Reference Guides**:
        -   `references/small_n_qsar_and_regularization.md` — read when running
            Hussain-Rea MMPA fragmentation, SALI activity cliff detection, or
            matched-pair delta distributions.
        -   `references/standard_agy_science_integration.md` — read when
            generating per-atom similarity attribution maps or integrating with
            sibling `rdkit-*` skills.
    -   **Standard Executables**:
        -   `python3 scripts/mmpa_sar_analysis.py` — Hussain-Rea matched
            molecular pair fragmentation (ranking recurring transformations by
            raw standard score $|\mu_\Delta| / \sigma_\Delta$), topological
            matched-pair shift analysis (`--min_similarity 0.60`, `--plot
            <out.png>`, `--paired_x_col
            <Delta_CNS_MPO|Delta_cLogP|Delta_TPSA|Delta_MW|Delta_RotB>` chosen
            by the agent to match the series optimization axis), and SALI
            activity cliff detection.
        -   `python3 scripts/similarity_map_generator.py` — per-atom attribution
            and property heatmaps over a 2D depiction.

4.  **Scientific Reporting & Multi-Panel Visualization**

    -   **Reference Guide**:
        `references/scientific_reporting_and_visualization.md` — read when
        building multi-panel scientific plots (`plot_archetypes.py`), MPO radar
        charts, or assembling reports.
    -   **Standard Executables & Custom Plot Styling Rule**:
        -   Always use `--plot` flags (`mmpa_sar_analysis.py --plot`,
            `congeneric_series_ml.py --plot_parity --plot_coefficients`) and
            `python3 scripts/plot_archetypes.py` instead of writing freeform
            Matplotlib plots. If a custom plot is ever required, import the
            styling helpers from `/opt/skills/rdkit-general/scripts/compat.py` (`from
            compat import PUBLICATION_PALETTE, apply_publication_spines,
            set_safe_plot_style; set_safe_plot_style()`) and call
            `apply_publication_spines(ax)` on every axis.
        -   `python3 scripts/mpo_pareto_radar.py` — renders normalized
            multi-parameter optimization (MPO) radar charts and Pareto frontier
            overlays comparing candidate profiles.
        -   `python3 scripts/report_builder.py` — assembles multi-section
            markdown deliverables with embedded figures.

--------------------------------------------------------------------------------

## Progressive Execution Protocol

1.  **Inspect Domain Reference**: Read the target reference guide in
    `references/` to load CLI flags and modeling safeguards.
2.  **Isolate Partitions & Train (`congeneric_series_ml.py`)**: Keep `train_cv`
    and `held_out_test` strictly separated (`--eval-split test`; never evaluate
    on pooled train+test sets) and tier models by Tukey HSD.
3.  **Benchmark Physics vs. ML (100% Series Coverage)**: When physics/docking is
    part of the request, batch-dock 100% of the series via
    `/opt/skills/cheminformatics-physics/scripts/molecular_docking_vina.py --workers 4`
    and run `physics_ml_comparator.py --eval-split test` (reporting docking and
    strain independently alongside calibrated multi-variable $\Delta$-ML).
4.  **Score Prospective Candidates & Summarize Findings**: Score novel designs
    via `predict_potency.py`, and summarize evaluation metrics, GFM tables, and
    generated figures in the output directory.
