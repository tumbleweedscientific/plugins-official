---
name: string-database
description: Query the STRING database for protein-protein interactions (PPIs), functional enrichment, and homology. Use when the user asks about interactions between specific proteins, interaction evidence, confidence scores, protein interaction partners, or pathway enrichments.
metadata:
  tumbleweed:
    domains:
    - proteomics
    tags:
    - string-database
    - database-use
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use string-database: Query the STRING database for protein-protein interactions (PPIs), functional enrichment, and homology.'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - polite-http
      - python
      - requests
      dataSources:
      - string
      - uniprot
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network: []
    inputs:
    - tsv
    - json
    outputs:
    - json
    - tsv
    title: STRING
license: Apache-2.0
---

# STRING Database Skill

This skill allows you to query the STRING database programmatically using a
bundled Python CLI wrapper.

## Core Rules

1.  **MANDATORY: Ask for Species First:** The STRING API requires NCBI Taxon
    IDs. **You MUST NOT guess or assume a species.** If the user does not
    explicitly state a species or Taxon ID, you MUST stop and ask: "Which
    species are you interested in? I need the NCBI Taxon ID to proceed." Even
    for well-known proteins like TP53, BRCA1, or MDM2 that are commonly
    associated with human studies, you MUST still ask — do not default to Human.
2.  **Never print output to stdout:** The `--output <file.tsv>` is required.
    Never read large outputs into context. Instead use jq, python or file
    operations (`grep`, `head`) to process large output.
3.  **Map Identifiers first:** If you only have common gene names (e.g.,
    'TP53'), map them to STRING IDs first as this guarantees much faster server
    responses. Use the `map` command for this.
4.  **Notification**: If this skill is used, ensure this is mentioned in the
    output.

## Tool Execution

The CLI is at `scripts/string_cli.py` and should be run using `python3 run`:

```bash
python3 scripts/string_cli.py <command> [options] --output /tmp/out.tsv
```

## Feature Domains (Progressive Disclosure)

Read the following reference files based on the user's request:

*   **[Mapping Identifiers](references/mapping.md)** - Map common protein names
    to STRING IDs.
*   **[Interactions & Network](references/interactions.md)** - Find interacting
    proteins, network topologies, mediators, homology, and visual network
    images.
*   **[Enrichment & Functional Annotations](references/enrichment.md)** -
    Analyze pathway enrichment (GO, KEGG, Pfam), PPI significance, or find all
    proteins associated with a specific term (e.g. Melanoma).
*   **[Values/Ranks Enrichment](references/valuesranks.md)** - Submit full
    experimental datasets (e.g., logFC, p-values) for rank-based enrichment
    analysis using the async background API.

To begin, read the reference file most appropriate to the current task to
discover the correct CLI command.

## Compact Query Mode & Context Hygiene

In addition to the primary CLI utilities above, compact stdin-JSON client script(s) (`scripts/rest_request.py`, base `https://string-db.org/api`) are bundled for concise, context-safe summaries:
- Keep collection queries bounded (`max_items=3`–`10`) and GraphQL selection sets narrow.
- Write large payloads to disk with `save_raw: true` / `--output` rather than printing full JSON into context, and re-run queries in long sessions rather than relying on truncated previews.
