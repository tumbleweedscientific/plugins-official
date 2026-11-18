#!/usr/bin/env python3
"""
admet_annotate.py -- OPTIONAL, ADVISORY ADMET / drug-likeness annotation of top hits.

Design constraints (from the skill spec):
  * ADVISORY ONLY -- never a hard filter. Annotations are appended to the top-N
    table; nothing is dropped based on them.
  * COMPOSABLE -- for model-based ADMET predictions use a dedicated ADMET skill
    (e.g. `admet-prediction`, which needs a GPU backend); this script only adds
    transparent RDKit rule-based flags.
  * SKIPPABLE -- large at-scale runs can omit this to stay fast.

Adds RDKit rule-based flags (Lipinski Ro5 violations, QED) to every top hit.

Input:
  --top tables/top_hits.csv   (from triage_sar.py)
Output:
  tables/top_hits_admet.csv   top hits + ADMET/advisory columns
  admet_meta.json             provider used, columns added, caveat text
"""
from __future__ import annotations
import argparse
import csv
import json
import os
import sys


def _rdkit_flags(smiles):
    from rdkit import Chem
    from rdkit.Chem import Descriptors, Crippen, rdMolDescriptors, QED
    m = Chem.MolFromSmiles(smiles)
    if m is None:
        return {}
    mw = Descriptors.MolWt(m); logp = Crippen.MolLogP(m)
    hbd = rdMolDescriptors.CalcNumHBD(m); hba = rdMolDescriptors.CalcNumHBA(m)
    ro5 = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    return {
        "Ro5_violations": ro5,
        "Lipinski_pass": "yes" if ro5 <= 1 else "no",
        "QED": round(QED.qed(m), 3),
        "MW": round(mw, 1), "cLogP": round(logp, 2),
    }


def run(args) -> int:
    rows = []
    with open(args.top, newline="") as fh:
        reader = csv.DictReader(fh)
        base_fields = reader.fieldnames or []
        for r in reader:
            rows.append(r)
    if args.limit:
        rows = rows[: args.limit]
    smis = [r.get("smiles", "") for r in rows]

    provider = "rdkit_rules"
    model_ann = None  # model-based ADMET columns come from a dedicated ADMET skill, not here

    # union of extra columns
    extra_cols = ["Ro5_violations", "Lipinski_pass", "QED_advisory"]
    model_cols = []
    if model_ann:
        for smi in smis:
            a = model_ann.get(smi)
            if isinstance(a, dict):
                for k in a.keys():
                    kk = f"admet_{k}"
                    if kk not in model_cols:
                        model_cols.append(kk)
    all_fields = base_fields + [c for c in extra_cols if c not in base_fields] + \
                 [c for c in model_cols if c not in base_fields]

    tables = os.path.dirname(args.top)
    out = os.path.join(tables, "top_hits_admet.csv")
    with open(out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=all_fields, extrasaction="ignore")
        w.writeheader()
        for r, smi in zip(rows, smis):
            flags = _rdkit_flags(smi)
            r["Ro5_violations"] = flags.get("Ro5_violations", "")
            r["Lipinski_pass"] = flags.get("Lipinski_pass", "")
            r["QED_advisory"] = flags.get("QED", "")
            if model_ann and isinstance(model_ann.get(smi), dict):
                for k, v in model_ann[smi].items():
                    r[f"admet_{k}"] = v
            w.writerow(r)

    meta = {"provider": provider, "n_annotated": len(rows),
            "model_columns": model_cols, "rule_columns": extra_cols,
            "caveat": ("ADVISORY ONLY -- ADMET/tox predictions are not applied as a "
                       "filter. Values are model estimates with substantial uncertainty; "
                       "use for prioritization/flagging, not decisions. Prefer a dedicated "
                       "tox/ADMET skill if one is available.")}
    with open(os.path.join(tables, "..", "admet_meta.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
    print(f"[OK] ADMET/advisory annotation via {provider} -> {out} "
          f"({len(rows)} hits, {len(model_cols)} model cols + rule flags)")
    return 0


def self_check() -> int:
    ok = True
    f = _rdkit_flags("CC(=O)Oc1ccccc1C(=O)O")  # aspirin: Ro5-clean
    if not f or f.get("Lipinski_pass") != "yes":
        print(f"[FAIL] rdkit flags -> {f}", file=sys.stderr); ok = False
    print(f"admet_annotate.py self-check: {'PASS' if ok else 'FAIL'} (rdkit flags ok)")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="Optional advisory ADMET annotation of top hits")
    ap.add_argument("--top", help="tables/top_hits.csv")
    ap.add_argument("--rdkit-only", action="store_true",
                    help="accepted for compatibility; annotation is always RDKit rule-based")
    ap.add_argument("--model-type", default="MPNN", help="accepted for compatibility; unused")
    ap.add_argument("--limit", type=int, default=0, help="cap #hits annotated")
    ap.add_argument("--self-check", action="store_true")
    args = ap.parse_args()
    if args.self_check:
        sys.exit(self_check())
    if not args.top:
        ap.error("--top is required")
    sys.exit(run(args))


if __name__ == "__main__":
    main()
