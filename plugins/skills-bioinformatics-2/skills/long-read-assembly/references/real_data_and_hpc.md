# Running on real data (public datasets, sandbox or external cluster)

Read on demand. Select user-provided reads or a public dataset below, and run the assembler in the
sandbox (`--backend local`), on an external cluster, or from a user installation (see `assembly_tool_selection.md`). This package does not
bundle or silently substitute an assembler.

> Verify every accession at the source before downloading; dataset contents and IDs change. The
> reference-genome RefSeq assemblies are the most stable anchors.

## Reference genomes (stable anchors for QUAST genome fraction / `reference_build`)

| Organism | Strain | RefSeq assembly | Size | Use |
|---|---|---|---|---|
| *Escherichia coli* | K-12 MG1655 | `GCF_000005845.2` (chromosome `NC_000913.3`) | ~4.64 Mbp, 1 circular | ONT isolate assembly + QUAST reference |
| *Saccharomyces cerevisiae* | S288C | `GCF_000146045.2` | ~12.16 Mbp, 17 chr (incl. mitochondrion) | PacBio HiFi assembly + QUAST reference |

## Real long-read datasets (pointers, not shipped)

- **ONT R10.4.1 bacterial WGS (raw signal + reads).** Multicenter dataset, 79 isolates across six
  species on R10.4.1 / V14 chemistry (*Scientific Data*, 2025; PMC `PMC12675498`) — a current-chemistry
  choice matching the analysis `run.json` (`R10.4.1`, `dna_r10.4.1_..._sup`).
- **Curated public ONT registry.** `github.com/hasindu2008/seq` tracks public Nanopore datasets with
  raw signal, including an ONT R10.4.1 section — use it to resolve exact ENA/SRA run IDs.
- **E. coli ONT (older R9.4.1) with matched reference + Illumina.** Zenodo record `7995806`
  (methylation-free E. coli K-12 MG1655) — useful when a truth reference and short reads are needed.
- **Yeast PacBio HiFi.** Query NCBI SRA/ENA for `Saccharomyces cerevisiae S288C` filtered to PacBio
  SMRT `HiFi`/CCS (e.g. BioProjects `PRJNA764426`, `PRJNA792930`); confirm the run is HiFi (CCS), not
  CLR, before assembling with hifiasm.

Record whichever dataset you use in `run.json` (`platform`, `flowcell_chemistry`, `basecaller`,
`basecaller_model`, `reference_build`) so the provenance and model/chemistry gate apply.

## Running the real assemblers / QC

Flye, hifiasm and minimap2 are in the sandbox image; Verkko, Canu, Raven, wtdbg2, Unicycler and
QUAST are not (install them on demand with `micromamba install -c bioconda ...`, or run them on an
external cluster for large genomes). Check the installed CLI with `<tool> --help`, then run:

```bash
flye --nano-hq reads.fastq.gz --out-dir out --threads 16
# HiFi:   hifiasm -o asm -t 32 reads.fastq.gz   (then awk/gfatools to convert the GFA to FASTA)
# HiFi+UL: verkko -d out --hifi hifi.fq.gz --nano ul.fq.gz        (not in the sandbox image)
# QC:     quast.py assembly.fasta -r reference.fasta -o quast_out (not in the sandbox image)
```

Match the `flye` mode flag to the read type (`--nano-hq`, `--nano-raw`, `--pacbio-hifi`,
`--pacbio-raw`) exactly as `scripts/lra.py:FLYE_MODE` records; the read-type guard
(`check_assembler_readtype`) rejects an assembler that does not match the declared `read_type` before
it runs. Size the machine to the tool (hifiasm/Canu: 100s of GB RAM for large genomes; Verkko:
multi-node). After the job completes, pass the returned `assembly.fasta`/`assembly_graph.gfa` back
into `run_assembly.py --assembler provided_draft --draft assembly.fasta` for polishing, QC,
contamination screening, and the report on the real assembly.
