#!/usr/bin/env python3
"""Two- or multi-group assumption checks, hypothesis testing, and effect sizes."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import stats


def cohens_d(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return float("nan")
    sa, sb = np.var(a, ddof=1), np.var(b, ddof=1)
    pooled = np.sqrt(((na - 1) * sa + (nb - 1) * sb) / (na + nb - 2))
    return float((np.mean(a) - np.mean(b)) / pooled) if pooled > 0 else 0.0


def analyze(df: pd.DataFrame, group_col: str, value_col: str) -> dict:
    clean = df[[group_col, value_col]].dropna()
    groups = [(str(k), g[value_col].to_numpy(dtype=float)) for k, g in clean.groupby(group_col)]
    diagnostics = []
    for name, vals in groups:
        shapiro_p = float(stats.shapiro(vals).pvalue) if 3 <= len(vals) <= 5000 else None
        diagnostics.append({
            "group": name,
            "n": int(len(vals)),
            "mean": float(np.mean(vals)),
            "sd": float(np.std(vals, ddof=1)) if len(vals) > 1 else None,
            "median": float(np.median(vals)),
            "iqr": float(np.percentile(vals, 75) - np.percentile(vals, 25)),
            "shapiro_p": shapiro_p,
        })

    arrays = [vals for _, vals in groups]
    levene_stat, levene_p = stats.levene(*arrays)
    result: dict = {
        "groups": diagnostics,
        "levene_variance_p": float(levene_p),
    }
    if len(arrays) == 2:
        t_stat, t_p = stats.ttest_ind(arrays[0], arrays[1], equal_var=False)
        u_stat, u_p = stats.mannwhitneyu(arrays[0], arrays[1], alternative="two-sided")
        result["tests"] = {
            "welch_t": {"stat": float(t_stat), "p": float(t_p), "cohens_d": cohens_d(arrays[0], arrays[1])},
            "mann_whitney_u": {"stat": float(u_stat), "p": float(u_p)},
        }
    elif len(arrays) > 2:
        f_stat, f_p = stats.f_oneway(*arrays)
        kw_stat, kw_p = stats.kruskal(*arrays)
        result["tests"] = {
            "one_way_anova": {"stat": float(f_stat), "p": float(f_p)},
            "kruskal_wallis": {"stat": float(kw_stat), "p": float(kw_p)},
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--group-col", required=True)
    parser.add_argument("--value-col", required=True)
    args = parser.parse_args()
    sep = "\t" if args.input.suffix.lower() == ".tsv" else ","
    df = pd.read_csv(args.input, sep=sep)
    print(json.dumps(analyze(df, args.group_col, args.value_col), indent=2))


if __name__ == "__main__":
    main()
