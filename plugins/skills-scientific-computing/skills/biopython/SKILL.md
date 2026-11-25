---
name: biopython
title: Biopython Sequence & Structure Analysis
description: Parse, transform, slice, translate, and summarize FASTA, FASTQ, GenBank, GFF, PDB, and mmCIF files deterministically in Python using Biopython (`Bio.SeqIO`, `Bio.Seq`, `Bio.Align`, `Bio.PDB`). Use for local sequence QC, format conversion, ORF scanning, pairwise alignments, and coordinate parsing in `/workspace/`.
license: MIT
metadata:
  tumbleweed:
    domains:
      - genomics
      - proteomics
      - structural-biology
    tags:
      - biopython
      - fasta
      - fastq
      - genbank
      - sequence-analysis
    maturity: stable
    citations: []
    starterPrompts:
      - Summarize read lengths, GC content, and translation frames for /workspace/sequences.fasta using Biopython.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - biopython
        - python
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      network: []
      longRunning: false
    inputs:
      - fasta
      - fastq
      - pdb
      - mmcif
      - gff
    outputs:
      - fasta
      - csv
      - json
      - report
---

# Biopython Sequence & Structure Analysis

Use `Bio.SeqIO`, `Bio.Seq`, `Bio.SeqUtils`, `Bio.Align`, and `Bio.PDB` in the sandbox for exact offline parsing and manipulation of biological sequence and structure records.

## Non-negotiables

1. **Stream large files**: iterate `SeqIO.parse(path, fmt)` rather than `list(SeqIO.parse(...))` when inspecting multi-megabyte FASTA/FASTQ/GenBank files.
2. **State genetic code table & strand explicitly**: pass `table=1` (standard) or `table=11` (bacterial/archaeal) to `seq.translate(table=..., to_stop=...)`, and confirm 5'->3' strand orientation before calling `reverse_complement()`.
3. **Never write silent heuristics without validation**: check nucleotide vs protein alphabet ambiguity and handle partial trailing codons (`len(seq) % 3 != 0`) cleanly instead of suppressing warnings.

## Bundled helper

Run [scripts/seq_stats.py](scripts/seq_stats.py) in the sandbox for deterministic per-record summary JSON:

```bash
python scripts/seq_stats.py /workspace/input.fasta --format fasta --out /workspace/seq_stats.json
```

See [references/biopython-recipes.md](references/biopython-recipes.md) for GenBank extraction, `Align.PairwiseAligner` scoring, and `Bio.PDB.MMCIFParser` chain extraction recipes.
