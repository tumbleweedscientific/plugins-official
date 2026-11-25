#!/usr/bin/env python3
"""Standardize and deduplicate a SMILES table with datamol."""
from __future__ import annotations

import argparse
import csv
from pathlib import Path
import datamol as dm


def standardize_row(smi: str) -> dict | None:
    mol = dm.to_mol(smi)
    if mol is None:
        return None
    clean = dm.standardize_mol(mol, disconnect_metals=True, normalize=True, reionize=True, uncharge=True)
    if clean is None:
        return None
    return {
        "canonical_smiles": dm.to_smiles(clean),
        "inchikey": dm.to_inchikey(clean),
        "mw": round(dm.descriptors.mw(clean), 3),
        "clogp": round(dm.descriptors.clogp(clean), 3),
        "tpsa": round(dm.descriptors.tpsa(clean), 2),
        "hbd": int(dm.descriptors.n_hbd(clean)),
        "hba": int(dm.descriptors.n_hba(clean)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--smiles-col", default="smiles")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sep = "\t" if args.input.suffix.lower() == ".tsv" else ","
    seen_ik: set[str] = set()
    rows_out: list[dict] = []
    with args.input.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=sep)
        for row in reader:
            smi = (row.get(args.smiles_col) or "").strip()
            res = standardize_row(smi) if smi else None
            if res is None or res["inchikey"] in seen_ik:
                continue
            seen_ik.add(res["inchikey"])
            rows_out.append({**row, **res})

    if not rows_out:
        args.out.write_text("", encoding="utf-8")
        return
    with args.out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
        writer.writeheader()
        writer.writerows(rows_out)


if __name__ == "__main__":
    main()
