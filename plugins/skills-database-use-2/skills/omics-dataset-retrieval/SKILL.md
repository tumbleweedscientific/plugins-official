---
name: omics-dataset-retrieval
description: Use to find, retrieve, catalog, and relevance-audit public omics datasets across GEO, SRA, ArrayExpress, CELLxGENE, and other repositories. Also use when curating a data atlas or assembling a comprehensive multi-study omics cohort, even when the user does not name a specific dataset or repository.
metadata:
  tumbleweed:
    domains:
    - genomics
    - transcriptomics
    - proteomics
    tags:
    - omics-dataset-retrieval
    - database-use
    maturity: stable
    citations: []
    starterPrompts:
    - Find all publicly available omics datasets for my disease of interest. Generate a PDF report with an intro, methods, results, conclusions and figures from all of the analyses you perform.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources:
      - geo
      - sra
      - biostudies
      - pride
      - proteomexchange
      - metabolights
      - cellxgene
      - encode-screen
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
    inputs:
    - csv
    - json
    - pdf
    - png
    - html
    outputs:
    - report
    - csv
    - json
    - png
    title: Omics Dataset Retrieval
license: Apache-2.0
---

# Omics Dataset Retrieval Skill

## Scope

Systematically retrieve, deduplicate, classify, and relevance-audit publicly available omics
datasets for a user-specified disease, phenotype, gene, or biological process. Covers all major
omics types (transcriptomics, proteomics, metabolomics, epigenomics, genomics, single-cell,
spatial transcriptomics, lipidomics, multi-omics) and the broadest possible set of public
repositories. Does **not** download raw data files or perform downstream analysis.

Use this skill when curating a data atlas or assembling a comprehensive multi-study cohort.
Treat requests for “all available,” “all relevant,” or “comprehensive” data as requiring a
multi-repository search, even when the user does not name specific datasets or repositories.
Do not treat a single CELLxGENE result as exhaustive; check for complete or original study
releases and relevant tissue or cell-type coverage across the repository tiers below.
For atlas requests, produce a study-level cross-repository ledger. For every relevant
non-CELLxGENE candidate, record exactly one outcome: matched to an included CELLxGENE study;
ineligible and excluded with study-specific evidence; or unmatched and eligible, surfaced for
retrieval. Do not declare CELLxGENE sufficient based on convenience or metadata quality.

---

## Inputs

| Parameter            | Type               | Description                                                                                                                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `disease_or_topic` | string             | Disease name, phenotype, gene, or biological process (e.g., "sickle cell disease", "Alzheimer's disease", "BCL11A")            |
| `synonyms`         | list[str]          | Alternative names, abbreviations, gene symbols (e.g., ["SCD", "SCA", "HbSS", "sickle cell anemia"])                            |
| `omics_types`      | list[str] or "all" | Restrict to specific omics types, or "all" (default)                                                                           |
| `organism`         | string             | "all" (default) — includes human, mouse, and all other organisms; restrict to "human" or "mouse" only if explicitly requested |
| `year_min`         | int                | Earliest publication year to include (default: no limit)                                                                       |
| `output_dir`       | path               | Where to save outputs (default: `/workspace/results/`)                                                                             |

---

## Outputs

| File                                       | Description                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `<disease>_omics_datasets_MASTER.csv`    | Full catalog with all metadata and relevance labels                           |
| `<disease>_omics_datasets_VALIDATED.csv` | Filtered to CORE + ADJACENT only                                              |
| `<disease>_omics_summary.md`             | Markdown summary: counts by omics type, repository, top datasets, limitations |
| `<disease>_omics_landscape.png`          | Overview figure: donut chart + repository bar + timeline (if requested)       |
| `report_<disease>_omics_landscape.pdf`   | PDF report (when the user requests a PDF report)                              |

**PDF reports:** When the user requests a PDF report (e.g. "Generate a PDF report with an
intro, methods, results, conclusions and figures"), load ReportLab
and use it to produce a PDF with intro, methods, results, conclusions, and at least
one figure (the landscape PNG). Before passing any DataFrame-derived text to ReportLab `Paragraph()`, coerce
nullable/NaN values to safe strings (e.g. `str(v) if pd.notna(v) else ""`) to avoid
`TypeError` crashes on `float('nan')`.

---

## Repository Coverage Map

Work through repositories in priority order. Tier 1 repositories have programmatic APIs and
are the highest-yield sources. Tier 2 have APIs but are more specialized. Tier 3 require
web search or manual curation. Always attempt all tiers — rare diseases often have data
only in Tier 2/3 repositories.

### Tier 1 — High-yield, programmatic APIs (always query)

| Repository                                | Omics Focus                          | API Base URL                                                     | Notes                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GEO (NCBI)**                      | All transcriptomics, epigenomics     | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`               | Largest source; run 20–40 targeted queries                                                                                                              |
| **SRA (NCBI)**                      | Raw sequencing reads                 | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` (db=sra)      | Complements GEO; finds studies not deposited as GEO series                                                                                               |
| **ArrayExpress / BioStudies (EBI)** | Transcriptomics, functional genomics | `https://www.ebi.ac.uk/biostudies/api/v1/search`               | European mirror of GEO; many unique studies                                                                                                              |
| **PRIDE / ProteomeXchange**         | Proteomics (MS)                      | `https://www.ebi.ac.uk/pride/ws/archive/v3/projects`           | Primary proteomics repository; v2 endpoint deprecated (404)                                                                                              |
| **OmicsDI (aggregator)**            | Multi-omics aggregator               | `https://www.omicsdi.org/ws/dataset/search`                    | Covers MetaboLights, MassIVE, GNPS, Metabolomics Workbench, ArrayExpress, GEO, PRIDE — use to catch metabolomics and avoid re-querying individual repos |
| **CZ CELLxGENE**                    | scRNA-seq, spatial                   | `https://api.cellxgene.cziscience.com/curation/v1/collections` | 33M+ cells; query by disease using `cellxgene_census` Python package                                                                                   |
| **GDC / TCGA (NCI)**                | Cancer multi-omics                   | `https://api.gdc.cancer.gov/`                                  | Best for cancer diseases; covers TCGA, TARGET, CGCI, CPTAC-GDC                                                                                           |

### Tier 2 — Specialized APIs (query when relevant to disease/omics type)

| Repository                             | Omics Focus                               | API / Access                                                                | When to use                                              |
| -------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| **ENCODE**                       | Epigenomics (ChIP-seq, ATAC-seq, RNA-seq) | `https://www.encodeproject.org/search/?format=json`                       | Regulatory genomics; TF binding; chromatin accessibility |
| **Expression Atlas (EBI)**       | Bulk + single-cell RNA-seq                | `https://www.ebi.ac.uk/gxa/json/experiments`                              | Curated, baseline + differential expression experiments  |
| **Human Cell Atlas (HCA)**       | scRNA-seq, spatial                        | `https://service.azul.data.humancellatlas.org/index/projects`             | Reference cell type atlases; healthy tissue baselines    |
| **Metabolomics Workbench (NIH)** | Metabolomics, lipidomics                  | `https://www.metabolomicsworkbench.org/rest/study/study_id/ST/named_json` | NIH-funded metabolomics; REST API available              |
| **MetaboLights (EBI)**           | Metabolomics                              | `https://www.ebi.ac.uk/metabolights/ws/studies/`                          | European metabolomics repository                         |
| **MassIVE / GNPS**               | Metabolomics, lipidomics                  | `https://massive.ucsd.edu/ProteoSAFe/datasets.jsp`                        | MS-based metabolomics; use OmicsDI to search             |
| **jPOST**                        | Proteomics (MS)                           | `https://repository.jpostdb.org/search`                                   | Japanese proteomics repository; ProteomeXchange member   |
| **iProX**                        | Proteomics (MS)                           | `https://www.iprox.cn/page/project.html`                                  | Chinese proteomics repository; ProteomeXchange member    |
| **cBioPortal**                   | Cancer multi-omics                        | `https://www.cbioportal.org/api/`                                         | Cancer genomics; mutation, CNA, expression, methylation  |
| **EpiRR / IHEC**                 | Epigenomics reference                     | `https://www.ebi.ac.uk/epirr/api/`                                        | IHEC reference epigenomes; healthy tissue baselines      |
| **Human Protein Atlas (HPA)**    | Proteomics, RNA-seq                       | `https://www.proteinatlas.org/api/`                                       | Tissue/cell-type protein and RNA expression              |
| **ENA (EBI)**                    | Raw sequencing                            | `https://www.ebi.ac.uk/ena/portal/api/search`                             | European mirror of SRA; raw reads                        |

### Tier 3 — Web search + manual curation (always attempt via WebSearch tool)

| Repository                             | Omics Focus          | Search Strategy                                                        |
| -------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| **Zenodo**                       | All types            | `WebSearch: "{disease}" omics dataset site:zenodo.org`               |
| **Figshare**                     | All types            | `WebSearch: "{disease}" RNA-seq proteomics site:figshare.com`        |
| **Dryad**                        | All types            | `WebSearch: "{disease}" omics data site:datadryad.org`               |
| **OSF (Open Science Framework)** | All types            | `WebSearch: "{disease}" omics dataset site:osf.io`                   |
| **Harvard Dataverse**            | All types            | `WebSearch: "{disease}" omics dataset site:dataverse.harvard.edu`    |
| **Synapse (Sage Bionetworks)**   | Neuroscience, cancer | `WebSearch: "{disease}" omics dataset site:synapse.org`              |
| **ICGC Data Portal**             | Cancer genomics      | `WebSearch: "{disease}" ICGC site:dcc.icgc.org`                      |
| **CPTAC (NCI)**                  | Cancer proteomics    | `WebSearch: "{disease}" CPTAC proteomics site:proteomics.cancer.gov` |
| **AWS Open Data Registry**       | All types            | `WebSearch: "{disease}" omics site:registry.opendata.aws`            |
| **dbGaP (NIH, controlled)**      | Genomics, WGS        | `WebSearch: "{disease}" WGS genomics site:ncbi.nlm.nih.gov/gap`      |
| **EGA (EBI, controlled)**        | Genomics, WGS        | `WebSearch: "{disease}" genome sequencing site:ega-archive.org`      |
| **JGA (Japan, controlled)**      | Genomics             | `WebSearch: "{disease}" genomics site:ddbj.nig.ac.jp/jga`            |
| **UK Biobank**                   | Population genomics  | `WebSearch: "{disease}" UK Biobank omics`                            |
| **FinnGen**                      | Population genomics  | `WebSearch: "{disease}" FinnGen GWAS`                                |

---

## Workflow

### Step 1 — Ask upfront clarification questions (MANDATORY before any search)

**This step is not optional.** Before running any queries, use `AskUserQuestion` to collect
the information below. Do not assume defaults — the answers materially affect which repositories
are queried, how many results are returned, and how the relevance audit is tuned.

Ask ALL of the following in a single `AskUserQuestion` call (skip any already answered in the
user's initial message, but always ask the rest):

**Q1 — Disease / topic** *(if not already provided)*

- What disease, phenotype, gene, or biological process should we search for?
- Any synonyms, abbreviations, or alternative names to include?
  (e.g., "SCD", "SCA", "HbSS" for sickle cell disease — more synonyms = better recall)
- Any key genes or pathways central to this topic?
  (used to build additional targeted GEO queries beyond the disease name alone)

**Q2 — Omics types**

- Which omics types should be included?
  - **All types (default)** — transcriptomics, proteomics, metabolomics, epigenomics, genomics, single-cell, spatial, multi-omics
  - **Transcriptomics only** — bulk RNA-seq, microarray, scRNA-seq, spatial
  - **Epigenomics only** — ChIP-seq, ATAC-seq, methylation, CUT&RUN, Hi-C
  - **Proteomics / metabolomics only** — MS proteomics, metabolomics, lipidomics
  - **Custom** — user specifies which types to include

**Q3 — Organism**

- Which organisms should be included?
  - **All organisms (default)** — human, mouse, and any other species
  - **Human only** — Homo sapiens studies only
  - **Specific species** — user specifies (e.g., mouse only, zebrafish only)

**Q4 — Year range**

- Any restriction on publication/deposit year?
  - **No restriction (default)** — all years
  - **Recent only** — e.g., 2018 onwards, 2020 onwards
  - **Custom range** — user specifies start and/or end year

**Q5 — Controlled-access repositories**

- Should we include controlled-access repositories (dbGaP, EGA, JGA)?
  These require institutional data access agreements to download data,
  but we can still catalog their existence and metadata.
  - **Yes, include and flag them (default)** — catalog with "Controlled" label
  - **No, open-access only** — skip dbGaP, EGA, JGA entirely

**Q6 — Goal / output format**

- What is the primary goal?
  - **Browse and select (default)** — CSV catalog + Markdown summary for review
  - **Landscape overview** — also generate a visual overview figure (donut + timeline + repository bar)
  - **Download and analyze** — also include direct download links and file formats where available
  - **All of the above**

**Q7 — Tissue or cell type focus** *(optional but significantly improves recall)*

- Are there specific tissues, cell types, or sample sources to prioritize?
  (e.g., "whole blood", "brain cortex", "CD34+ HSCs", "plasma", "tumor")
  These are added as targeted search terms to GEO and other repositories.
  If none specified, broad disease-name queries are used.

Only proceed to Step 2 once all answers are collected. If the user provides partial information
upfront (e.g., just the disease name), ask only the remaining unanswered questions.

### Step 2 — Build search term matrix

Generate a comprehensive set of search queries by combining:

- Primary disease name + synonyms
- Omics-type-specific terms (RNA-seq, microarray, ChIP-seq, ATAC-seq, scRNA-seq, proteomics, metabolomics, methylation, WGS, SNP array, CUT&RUN, Hi-C, spatial transcriptomics, lipidomics)
- Tissue/cell-type terms relevant to the disease
- Clinical context terms (treatment, crisis, biomarker, pediatric, longitudinal)
- Key gene/pathway terms central to the disease

**GEO query syntax tips:**

- Use `[Title]` field tag for high-precision hits: `"sickle cell"[Title] AND "RNA-seq"`
- Use `[DataSet Type]` for omics filtering: `"expression profiling by array"[DataSet Type]`
- Use `retmax=100` per query; run 20–40 queries to maximize recall
- Deduplicate by GEO UID across all queries

### Step 3 — Query GEO (NCBI E-utilities) — PRIMARY SOURCE

```python
import requests, time, pandas as pd

BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"

# Build 20-40 queries combining disease + omics + tissue + gene terms
# Example for any disease:
search_queries = {
    "title_rnaseq":    f'"{disease}"[Title] AND "RNA-seq"',
    "title_scrna":     f'"{disease}"[Title] AND "single cell"',
    "title_array":     f'"{disease}"[Title] AND "expression profiling by array"[DataSet Type]',
    "title_chip":      f'"{disease}" AND "ChIP-seq"',
    "title_atac":      f'"{disease}" AND "ATAC-seq"',
    "title_methyl":    f'"{disease}" AND "methylation"',
    "title_wgs":       f'"{disease}" AND "whole genome sequencing"',
    "title_proteom":   f'"{disease}" AND "proteomics"',
    "title_metabolom": f'"{disease}" AND "metabolomics"',
    # Add synonym-based queries:
    # f'"{synonym}"[Title] AND "RNA-seq"' for each synonym
    # Add tissue-specific queries:
    # f'"{disease}" AND "{tissue_term}"' for key tissues
    # Add gene-specific queries:
    # f'"{disease}" AND "{key_gene}"' for key disease genes
}

all_ids = set()
for label, query in search_queries.items():
    r = requests.get(f"{BASE}esearch.fcgi",
                     params={"db": "gds", "term": query, "retmax": 100, "retmode": "json"})
    ids = r.json().get("esearchresult", {}).get("idlist", [])
    all_ids.update(ids)
    time.sleep(0.34)  # Stay under NCBI rate limit (3 req/sec without API key)

# Fetch summaries in batches of 20
records = []
for i in range(0, len(list(all_ids)), 20):
    batch = list(all_ids)[i:i+20]
    r = requests.get(f"{BASE}esummary.fcgi",
                     params={"db": "gds", "id": ",".join(batch), "retmode": "json"})
    result = r.json().get("result", {})
    for uid in result.get("uids", []):
        item = result[uid]
        records.append({
            "Accession": item.get("accession", ""),
            "Title": item.get("title", ""),
            "GEO_Type": item.get("gdstype", ""),
            "Organism": item.get("taxon", ""),
            "N_Samples": item.get("n_samples", ""),
            "Date": item.get("pdat", ""),
            "Summary": item.get("summary", "")[:500],
            "Repository": "GEO",
        })
    time.sleep(0.34)

df_geo = pd.DataFrame(records)
# Filter: GSE/GDS accessions only (exclude GPL platform records)
# By default, keep ALL organisms. Only filter by organism if user explicitly requested a specific species.
# Example organism filter (apply only if requested):
#   df_geo = df_geo[df_geo["Organism"].str.contains("Homo sapiens", na=False)]
df_geo = df_geo[df_geo["Accession"].str.startswith(("GSE", "GDS"))]
```

**NCBI API key**: Set `api_key` param to increase rate limit to 10 req/sec (register free at NCBI).

### Step 4 — Query SRA (NCBI) for raw sequencing studies not in GEO

```python
import xml.etree.ElementTree as ET

# SRA catches studies deposited as raw reads without a GEO series.
#
# IMPORTANT — SRA esummary response shape (verified against the live API):
# Unlike GEO esummary (which returns nested dicts), the SRA esummary returns
# XML *strings* in the "expxml" and "runs" fields. The top-level item has only
# {uid, expxml, runs, extlinks, createdate, updatedate} — there are NO
# "experiment"/"study"/"sample"/"organism"/"title"/"summary" dict fields.
# Parsing expxml/runs as nested dicts (the old code) therefore yields 0 records.
# Parse the XML strings with xml.etree.ElementTree instead.
sra_records = []
for query in [disease] + synonyms[:3]:
    # Default: search all organisms. Add AND "Homo sapiens"[Organism] only if user requested human-only.
    r = requests.get(f"{BASE}esearch.fcgi",
                     params={"db": "sra", "term": f'"{query}"',
                             "retmax": 100, "retmode": "json"})
    ids = r.json().get("esearchresult", {}).get("idlist", [])
    if ids:
        # Fetch in batches of 50 to stay within esummary limits
        for bi in range(0, len(ids), 50):
            batch = ids[bi:bi+50]
            r2 = requests.get(f"{BASE}esummary.fcgi",
                              params={"db": "sra", "id": ",".join(batch), "retmode": "json"})
            result = r2.json().get("result", {})
            for uid in result.get("uids", []):
                item = result[uid]
                expxml = item.get("expxml", "") or ""
                runs_xml = item.get("runs", "") or ""

                # Parse the expxml XML string for metadata.
                title = ""
                exp_acc = ""
                study_acc = ""
                sample_acc = ""
                organism_name = "unknown"
                exptype = ""
                try:
                    root = ET.fromstring(f"<root>{expxml}</root>")
                    summary_el = root.find(".//Summary")
                    if summary_el is not None:
                        title_el = summary_el.find("Title")
                        if title_el is not None:
                            title = title_el.text or ""
                    exp_el = root.find(".//Experiment")
                    if exp_el is not None:
                        exp_acc = exp_el.get("acc", "")
                    study_el = root.find(".//Study")
                    if study_el is not None:
                        study_acc = study_el.get("acc", "")
                    sample_el = root.find(".//Sample")
                    if sample_el is not None:
                        sample_acc = sample_el.get("acc", "")
                    org_el = root.find(".//Organism")
                    if org_el is not None:
                        organism_name = org_el.get("ScientificName", "unknown")
                    lib_el = root.find(".//LIBRARY_STRATEGY")
                    if lib_el is not None and lib_el.text:
                        exptype = lib_el.text
                except ET.ParseError:
                    pass

                # Parse the runs XML string for the run accession + spot count.
                run_acc = ""
                n_spots = ""
                try:
                    run_root = ET.fromstring(f"<root>{runs_xml}</root>")
                    run_el = run_root.find(".//Run")
                    if run_el is not None:
                        run_acc = run_el.get("acc", "")
                        n_spots = run_el.get("total_spots", "")
                except ET.ParseError:
                    pass

                # Prefer the most specific real accession; fall back through the chain
                accession = run_acc or exp_acc or study_acc or sample_acc or ""
                # Drop rows where ALL metadata fields are empty — these are just
                # numeric internal IDs with no usable information.
                if not any([accession, title, organism_name != "unknown"]):
                    continue
                sra_records.append({
                    "Accession": accession,
                    "Title": title,
                    "GEO_Type": exptype,
                    "Organism": organism_name,
                    "N_Samples": n_spots,
                    "Date": item.get("createdate", ""),
                    "Summary": "",
                    "Repository": "SRA",
                })
        time.sleep(0.34)
```

## Detailed Reference & Caveats

For complete step-by-step code recipes, decision tables, error handling, and scientific caveats, see [references/detailed_reference.md](references/detailed_reference.md).
