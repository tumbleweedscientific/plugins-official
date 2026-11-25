# Statistical Test Selection Guide

| Design | Parametric | Non-parametric | Effect Size |
| --- | --- | --- | --- |
| Two independent groups | Welch's *t*-test | Mann-Whitney *U* | Hedges' *g* / rank-biserial *r* |
| Two paired/matched groups | Paired *t*-test | Wilcoxon signed-rank | Paired *d_z* |
| >=3 independent groups | Welch/One-way ANOVA + Games-Howell/Tukey HSD | Kruskal-Wallis + Dunn (Holm) | Eta-squared / epsilon-squared |
| 2x2 or RxC categorical | Pearson chi-square (expected >= 5) | Fisher exact / Barnard exact | Odds ratio + 95% CI, Cramer's V |
| Multiple endpoints | `multipletests(p, method="holm")` (FWER) | `multipletests(p, method="fdr_bh")` (FDR) | Adjusted *q*-values |

## Multiple Testing Correction Snippet

```python
from statsmodels.stats.multitest import multipletests

rejected, q_values, _, _ = multipletests(raw_p_values, alpha=0.05, method="fdr_bh")
```
