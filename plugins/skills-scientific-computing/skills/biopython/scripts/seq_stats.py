#!/usr/bin/env python3
"""Deterministic FASTA/FASTQ/GenBank sequence summary via Biopython."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from Bio import SeqIO
from Bio.SeqUtils import gc_fraction


def summarize(path: Path, fmt: str) -> dict:
    records = []
    total_len = 0
    for rec in SeqIO.parse(str(path), fmt):
        seq_str = str(rec.seq).upper()
        length = len(seq_str)
        total_len += length
        nuc_chars = set(seq_str) - {"-", "N", "?"}
        is_nuc = nuc_chars.issubset({"A", "C", "G", "T", "U"})
        entry = {
            "id": rec.id,
            "length": length,
            "alphabet": "nucleotide" if is_nuc else "protein_or_ambiguous",
        }
        if is_nuc and length > 0:
            entry["gc_percent"] = round(gc_fraction(rec.seq) * 100.0, 2)
        records.append(entry)
    return {
        "file": str(path),
        "format": fmt,
        "count": len(records),
        "total_residues": total_len,
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--format", default="fasta", choices=["fasta", "fastq", "genbank"])
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()
    summary = summarize(args.input, args.format)
    rendered = json.dumps(summary, indent=2)
    if args.out is not None:
        args.out.write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
