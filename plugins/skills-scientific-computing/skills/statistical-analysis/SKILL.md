---
name: statistical-analysis
title: Statistical Hypothesis Testing & Effect Sizes
description: Rigorous statistical test selection, parametric/non-parametric assumption checks, effect size + confidence interval estimation, ANOVA/regression modeling, and Benjamini-Hochberg / Holm multiple-testing correction using `scipy.stats` and `statsmodels`.
license: MIT
metadata:
  tumbleweed:
    domains:
      - lab-data
      - clinical
      - genomics
    tags:
      - statistics
      - hypothesis-testing
      - effect-size
      - fdr
      - statsmodels
    maturity: stable
    citations: []
    starterPrompts:
      - Check normality and variance homogeneity across experimental groups in /workspace/measurements.csv, run appropriate hypothesis tests with effect sizes, and apply BH-FDR correction.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - python
        - scipy
        - statsmodels
        - pandas
        - numpy
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

# Statistical Hypothesis Testing & Assumption Auditing

Always justify test choice from study design, sample size, independence/pairing, and distributional diagnostics, and report effect sizes plus multiple-testing adjustments rather than bare *p*-values.

## Non-negotiables

1. **Check independence vs pseudo-replication first**: distinguish technical replicates from biological replicates; use mixed-effects or subject-level aggregation before running unpaired tests on correlated measurements.
2. **Report effect size and 95% confidence intervals** alongside exact test statistic, degrees of freedom, sample size per group (`n`), and *p*-value / adjusted *q*-value.
3. **Prefer Welch's *t*-test (`equal_var=False`) or Mann-Whitney *U* by default** instead of assuming equal variances blindly.
4. **Always control family-wise error or FDR** (`statsmodels.stats.multitest.multipletests(pvals, method="fdr_bh")` or `"holm"`) whenever evaluating multiple endpoints, biomarkers, or pairwise contrasts.

## Bundled helper

Run [scripts/stat_check.py](scripts/stat_check.py) in the sandbox for standardized two-group or multi-group diagnostics and assumption-checked comparison:

```bash
python scripts/stat_check.py /workspace/measurements.csv --group-col treatment --value-col response
```

See [references/test-selection.md](references/test-selection.md) for decision tables covering continuous, categorical, survival, and regression tests.
