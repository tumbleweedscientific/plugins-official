# Relevant Resources (seed / fallback inventory)

Use this list as a seed/fallback and a map of *which resource feeds which axis* and
*which sibling skill actually runs it*. Verify packages with imports and sibling skills by
loading them before quoting them in a report.

## Structured evidence sources per axis

| Axis | Primary resource(s) | How accessed |
|---|---|---|
| Drug MoA / safety / mouse pheno / genetics-assoc | **Open Targets Platform** | GraphQL API — see `opentargets-database` skill + `opentargets_queries.md` |
| Functional / CRISPR | **DepMap** | CSV download (`CRISPRGeneEffect.csv`) into `/workspace/data/datalake/depmap/crispr_screen/`, read target rows/cols only |
| Human genetics | **GeneBass** (pLoF/missense burden), **GWAS Catalog**, **gnomAD** (constraint) | `genebass-gene-burden`, `gwas-catalog`, `gnomad-database` skills |
| Mouse KO | Open Targets `mousePhenotypes` | GraphQL |
| Drug depth (optional) | **ChEMBL**, **OpenFDA** | `chembl-database`, `openfda-database` skills |
| Directional evidence (all axes) | **Literature search** (`pubmed-database`, `literature-search-europepmc`, `literature-search-openalex`, or `web_search`) | agent appends one JSON record per paper to `/workspace/results/execution_trace/references.jsonl` |

## Sibling skills to cross-reference in the report ("how to run the follow-ups")

- **`opentargets-database`** / **`open-targets-target-prioritization`** — genetics/association/drug-MoA queries.
- **`mendelian-randomization-twosamplemr`** — causal direction from human genetics (a strong
  complement to the genetics axis when instruments exist).
- **`genebass-gene-burden`**, **`gwas-catalog`**, **`gnomad-database`** — human-genetics evidence.
- **`clinicaltrials-landscape`** — clinical pipeline depth for the drug-MoA axis.
- **`literature-preclinical`** / **`literature-review`** — deeper preclinical/literature synthesis.
- **`methods-landscape-review`** — sibling synthesis skill (compare *methods*, not direction).

## Packages available (no install needed)

Python: `requests`, `pandas`, `numpy`, `reportlab`, `pypdf`, `gseapy`, `lifelines`.
R: `ggplot2`, `ggprism`, `dplyr`, `tidyr`, `RColorBrewer`, `ComplexHeatmap`, `org.Hs.eg.db`.

## Downloadable datasets worth knowing for direction context

None of these are preinstalled; download into `/workspace/data/datalake/` when needed.

- **DepMap** — CRISPR effect/dependency, expression, mutations.
- **GTEx** — tissue expression / eQTL (or the `gtex-database` skill's API).
- **MSigDB** — gene-set context (`msigdbr` in R).
- **PrimeKG** — precision-medicine knowledge graph (target–disease–drug relationships).
- **Broad Drug Repurposing Hub** — molecule → MoA/target.
