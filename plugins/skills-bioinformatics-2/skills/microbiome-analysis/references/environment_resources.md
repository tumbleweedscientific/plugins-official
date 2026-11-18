# Environment resources used by this skill

This skill runs in the sandbox image, which ships most of the packages it needs.
**Use them instead of re-installing or reinventing.** This file maps the resources this
skill relies on to each stage, and gives the discovery checks to run.

## How to discover what's actually available

Environments drift, so **confirm availability at runtime** rather than assuming.
Verify Python packages with `importlib.util.find_spec` and R packages with
`requireNamespace()`; check command-line tools with `command -v`.

For external knowledge, use the dedicated tools rather than model memory:
- **Literature search** (`pubmed-database`, `literature-search-europepmc` or
  `literature-search-openalex` skills) — papers for the report's Introduction, mechanistic
  interpretation, and References.
- **Free enzyme databases** (ExplorEnz / IUBMB Enzyme Nomenclature, Rhea) — verify the
  **EC numbers** behind the metabolite modules. KEGG is intentionally **not** used
  (not licensed for commercial use — see `DATA_SOURCES.md`).
- `web_search` / `web_fetch` — current, non-paper context (e.g. a DB/version note).

## Packages this skill uses

### Python
| Package | Role in this skill |
|---|---|
| `biom-format` | Read/write BIOM feature tables (interop with QIIME2/PICRUSt2 I/O). Preinstalled. |
| `scipy`, `statsmodels` | Wilcoxon/Mann–Whitney tests and BH-FDR in the metabolite-module script (Stage 4). Preinstalled. |
| `gseapy` | Optional gene-set/pathway enrichment on ranked EC tables (Stage 3), descriptive only. Preinstalled. |
| `pandas`, `numpy` | Table wrangling throughout. Preinstalled. |
| `reportlab`, `pypdf`, `pillow` | PDF report + validation + aspect-safe image embedding (Stage 5). Preinstalled. |
| `matplotlib`, `seaborn` | Data plots (Stages 1–4). Preinstalled. |
| `scikit-bio` | Optional Python alternative to the R phyloseq/vegan path in Stage 1. **Not preinstalled** (`python3 -m pip install scikit-bio`). |

### R
| Package | Role in this skill |
|---|---|
| `phyloseq`, `vegan` | Import feature table + taxonomy + tree; diversity + ordination backbone (Stages 1–2). Preinstalled. |
| `ALDEx2`, `MaAsLin2`, `ANCOMBC` | Differential-abundance consensus (Stages 2–3). Preinstalled. |
| `microbiome` | Convenience helpers. **Not preinstalled** (`BiocManager::install("microbiome")`). |
| `ComplexHeatmap` | Taxa × sample abundance heatmaps (Stage 2 visualization). Preinstalled. |
| `clusterProfiler` | Optional enrichment/annotation if extending function analysis. Preinstalled. |
| `ggplot2`, `ggprism`, `ggrepel`, `RColorBrewer` | Publication figures (LFC forests, diversity boxplots). Preinstalled. |
| `dplyr`, `tidyr`, `tibble`, `readr` | Data wrangling. Preinstalled. |

### Command line
| Tool | Role |
|---|---|
| PICRUSt2 2.6.4 (`picrust2_pipeline.py`) | Functional prediction (Stage 3). Preinstalled; see `commands_and_environment.md` for the OOM-safe invocation and machine sizing. |
| FastQC / MultiQC | Read QC if the user brings raw reads (upstream of this skill's scope). Preinstalled. |

## Public databases this skill uses

| Database | Use |
|---|---|
| Reactome | Optional pathway context for host-side interpretation (e.g. SCFA receptor signaling). Free (CC0). |
| UniProt / NCBI | Look up specific enzymes/genes or taxa when annotating a hit. Free. |

> **KEGG is intentionally NOT used by this skill** (KO IDs and KEGG pathway/module data
> are not licensed for commercial use). The metabolite modules are keyed on **EC numbers**
> (free IUBMB nomenclature). Verify/extend them against free enzyme databases — ExplorEnz
> (official IUBMB Enzyme List), the IUBMB Enzyme Nomenclature site, or Rhea (EBI, CC BY) —
> and refresh `references/metabolite_modules_ec.csv` the same way. Do not query or ship
> MetaCyc/BioCyc (subscription-only since 2024). See `DATA_SOURCES.md`.

## Optional extensions

Only if the analysis grows beyond the core 16S workflow (e.g. the study pairs microbiome
with host transcriptomics): MSigDB gene sets (`msigdbr` in R) for host-side enrichment, and
the Human Protein Atlas (`human-protein-atlas-database` skill) for tissue/immune context of
host receptors (GPR43/GPR109A, AhR). Mention them only if the user's question spans host
multi-omics.

## Upstream processing (out of the default scope)

This skill assumes a **processed** feature table. Amplicon denoising (DADA2/Deblur) and
taxonomy assignment remain the user's upstream responsibility; read QC can be done with
FastQC/MultiQC in the sandbox.

## One-line summary of the resource routing

- **Discovery** → direct package imports, `requireNamespace()`, `command -v`.
- **Literature / citations / mechanism** → literature skills (+ `web_search`/`web_fetch` for non-paper context).
- **Enzyme (EC) verification** → ExplorEnz / IUBMB / Rhea (free). **Not KEGG** (unlicensed for commercial use).
- **Diversity/ordination** → R `phyloseq`/vegan (or Python `scikit-bio` after installing it).
- **BIOM I/O** → `biom-format`.
- **Stats/FDR** → `scipy`/`statsmodels` (Python), Bioconductor stack (R).
- **Report + infographic** → `build_report.py` (ReportLab) + a matplotlib schematic.
