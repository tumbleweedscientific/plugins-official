---
name: matchms
title: Tandem Mass Spectrometry (MS/MS) Spectral Matching
description: Parse, clean, normalize, filter, and score tandem mass spectrometry (MS/MS) MGF, MSP, mzML, and mzXML spectral libraries for metabolomics and proteomics using `matchms` (with pure NumPy/SciPy binned cosine fallback when `matchms` is absent).
license: MIT
metadata:
  tumbleweed:
    domains:
      - metabolomics
      - proteomics
    tags:
      - mass-spectrometry
      - ms2
      - cosine-similarity
      - mgf
      - metabolomics
    maturity: stable
    citations: []
    starterPrompts:
      - Clean intensities, normalize precursors, and compute modified cosine spectral matches on /workspace/spectra.mgf.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - python
        - numpy
        - scipy
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      network: []
      longRunning: false
    inputs:
      - csv
      - tsv
      - json
    outputs:
      - csv
      - json
      - report
---

# Tandem Mass Spectrometry (MS/MS) Processing with `matchms`

Use `matchms` (`load_from_mgf`, `load_from_msp`, `default_filters`, `normalize_intensities`, `CosineGreedy`, `ModifiedCosine`) to clean tandem mass spectra and compare experimental MS2 scans against reference libraries.

## Workflow

1. Check environment availability first (`python -c "import matchms; print(matchms.__version__)"`). If `matchms` is not installed in the sandbox, use the binned NumPy/SciPy cosine similarity implementation in [references/matchms-workflows.md](references/matchms-workflows.md) rather than fabricating library scores.
2. Apply canonical metadata & peak filters (`default_filters`, `add_precursor_mz`, `normalize_intensities`, `select_by_mz`, `require_minimum_number_of_peaks`).
3. Score candidate pairs via `CosineGreedy(tolerance=0.01)` or `ModifiedCosine(tolerance=0.01)` and enforce both a minimum similarity score (e.g. `>= 0.7`) and minimum matched fragment peaks (`>= 6`).
4. Report exact precursor m/z tolerances, adduct state, and matched-peak counts alongside similarity scores.

See [references/matchms-workflows.md](references/matchms-workflows.md) for full `matchms` pipeline templates and pure NumPy fallback scoring.
