---
name: gnomad-database
description: Query the Genome Aggregation Database (gnomAD). Use when determining the rarity or allele frequency of specific genetic variants, retrieving gene constraint metrics (pLI, LOEUF) to assess loss-of-function intolerance, finding variants in a genomic region or gene, or querying structural variants. Don't use for analyzing individual patient genomes, tracking somatic mutations in cancer (use COSMIC), or requesting raw sequencing reads (use ENA).
metadata:
  tumbleweed:
    domains:
    - genomics
    - variant-interpretation
    tags:
    - gnomad-database
    - database-use
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use gnomad-database: Query the Genome Aggregation Database (gnomAD).'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - polite-http
      - python
      - requests
      dataSources:
      - gnomad
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network:
      - gnomad.broadinstitute.org
    inputs:
    - json
    outputs:
    - json
    title: gnomAD
license: Apache-2.0
---

# gnomAD Database

## Core Rules

-   **Use the Wrapper**: ALWAYS execute the provided helper scripts to query the
    database rather than accessing the database directly. The scripts
    automatically enforce the gnomAD API rate limits gracefully.
-   **Notification**: If this skill is used, ensure this is mentioned in the
    output.

## Utility Scripts

All scripts are located in the `scripts/` subdirectory of this skill's
installation directory. When running them, use the full absolute path to the
script (e.g. `scripts/get_variant_frequency.py`).

**1. Variant Frequency.** Retrieves global and ancestry-specific allele
frequencies, homozygote counts, and **Grpmax Filtering AF** (faf95/faf99) for
exome, genome, and total (exome+genome combined) data. The filtering allele
frequency (FAF) is the maximum credible genetic ancestry group AF (lower bound
of the 95% or 99% CI). Variant ID format must be `chrom-pos-ref-alt` (e.g.,
`1-55516888-G-GA`). Alternately, you may provide an `rsID`.

```bash
# By variant ID:
python3 scripts/get_variant_frequency.py --variant_id {variant_id} [--dataset {dataset}] --output variant_frequency.json

# By rsID (e.g., rs1800562):
python3 scripts/get_variant_frequency.py --rsid {rsid} [--dataset {dataset}] --output variant_frequency.json
```

**2. Gene Constraint.** Retrieves constraint metrics for a gene. The response
will explicitly contain `pli`, and the LOEUF score is represented by
`oe_lof_upper`.

```bash
python3 scripts/get_gene_constraint.py --gene {gene_symbol} --output {gene_symbol}_constraint.json
```

**3. Region/Gene Variant Search.** Finds all variants in a region or gene.

```bash
# By region:
python3 scripts/search_variants.py --chrom {chrom} --start {start} --end {end} --output region_variants.json
# By gene:
python3 scripts/search_variants.py --gene {gene_symbol} --consequence {pLoF|missense} --output {gene_symbol}_variants.json
```

## References

Further documentation on the data: https://gnomad.broadinstitute.org/data#api
More general database documentation: https://gnomad.broadinstitute.org/help

## Compact Query Mode & Context Hygiene

In addition to the primary CLI utilities above, compact stdin-JSON client script(s) (`scripts/gnomad_graphql.py`, base `https://gnomad.broadinstitute.org/api`) are bundled for concise, context-safe summaries:
- Keep collection queries bounded (`max_items=3`–`10`) and GraphQL selection sets narrow.
- Write large payloads to disk with `save_raw: true` / `--output` rather than printing full JSON into context, and re-run queries in long sessions rather than relying on truncated previews.
