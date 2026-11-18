# Resources catalog (Step 7 seed)

> **How this skill uses this file (Step 7).** This is a seed map, not an inventory. At runtime,
> verify packages with direct imports (`importlib.util.find_spec`, `requireNamespace()`), CLIs
> with `command -v`, and sibling skills by loading them. Verified runtime results take
> precedence. The report's resource section should name concrete databases/datasets/packages
> and **cross-reference the sibling skill(s) that actually run the recommended method**.
> GPU-only methods (structure prediction, protein design, foundation models) run through the
> `model_use` skills on a GPU backend, not in the CPU sandbox.

## Task-type → resource mapping (starting points; verify at runtime)

- *Bulk RNA-seq DE / method comparison*: R `DESeq2`, `apeglm`, `edgeR`, `limma`, `tximport`;
  data GTEx, MSigDB; skills `rnaseq-fastq-to-counts`, `bulk-rnaseq-counts-to-de-deseq2`,
  `functional-enrichment-from-degs`, `gtex-database`.
- *Alignment / quantification*: CLI `STAR`, `hisat2`, `salmon`, `minimap2`, `bowtie2`, `bwa`,
  `samtools`, `bedtools` (all in the sandbox image).
- *Variant calling / annotation*: CLI `gatk4`, `bcftools`, `snpEff` (sandbox image); DBs
  gnomAD, ClinVar, dbSNP, Ensembl; skills `gnomad-database`, `clinvar-database`,
  `dbsnp-database`, `ensembl-database`.
- *scRNA-seq (QC, integration, trajectory)*: Python `scanpy`, `scvelo`, `cellrank`,
  `scrublet`, `harmonypy`, `celltypist`; R `Seurat`, `SoupX`; skills `single-cell-rna-qc`,
  `scrna-trajectory-inference`, `cell-cell-communication`,
  `single-cell-multi-omics-data-harmonization`.
- *Enrichment / pathways / regulators*: `gseapy`, `decoupler`, `clusterProfiler`, `fgsea`,
  `msigdbr`; DBs `KEGG [NC — excluded]`, Reactome, MSigDB, Gene Ontology; skills
  `functional-enrichment-from-degs`, `reactome-database`, `quickgo-database`.
  (For commercial-safe pathway work recommend Reactome / Gene Ontology / MSigDB, not KEGG.)
- *Structure prediction / protein design* (GPU backend): skills `openfold3`, `boltz`, `chai1`,
  `esmfold2`, `proteinmpnn`, `ligandmpnn`; DBs RCSB PDB, AlphaFold DB, UniProt, InterPro via
  `pdb-database`, `alphafold-database-fetch-and-analyze`, `uniprot-database`, `interpro-database`.
- *Drug / target / pharmacology*: DBs `ChEMBL [SA]`, OpenFDA, cBioPortal, STRING, Open Targets
  via `chembl-database`, `openfda-database`, `cbioportal`, `string-database`,
  `opentargets-database`; Python `rdkit`, `datamol`, `medchem`; ADMET via `admet-prediction`
  (GPU backend). (Recommend ChEMBL only with a ShareAlike/attribution caveat; OpenFDA and
  cBioPortal are permissive alternatives.)
- *Survival / clinical / ML biomarker*: `lifelines`, `scikit-learn`, `statsmodels`, R
  `survival`/`survminer`; skills `survival-analysis-clinical`, `real-world-evidence`.
- *Clinical-trial / literature landscape*: skills `clinicaltrials-landscape`,
  `clinical-trials-database`, `literature-review`, `literature-preclinical`.

## 0. Licensing & commercial-use policy (read before recommending anything)

This skill produces decision-support reports that may inform **commercial** work. Some
resources carry licenses that forbid or restrict commercial use. **Recommendations must respect
these licenses.** Apply the following policy whenever building the "Relevant resources"
section (Step 7), including to resources found during runtime verification.

**Tag legend**
- `[NC]` — **Non-commercial license. DO NOT recommend.** Omit the resource from recommendations
  and add a one-line note that it was excluded for commercial-licensing reasons. Do not curate a
  replacement (simply omit + note).
- `[SA]` — **ShareAlike / attribution license. Recommend only with an explicit caveat** that the
  resource requires attribution and/or share-alike redistribution terms for downstream/commercial use.
- *(untagged)* — treated as **permissive / commercial-safe**; recommend normally.

**Restricted-resource table** (the only resources that carry constraints; everything else in
this catalog is treated as permissive):

| Resource | Class | Action in recommendations |
|---|---|---|
| KEGG | `[NC]` | Omit + note. For pathways use Reactome, Gene Ontology or MSigDB. |
| DisGeNET | `[NC]` | Omit + note (gene–disease). |
| OMIM | `[NC]` | Omit + note. |
| DrugBank | `[NC]` | Omit + note. |
| COSMIC | `[NC]` | Omit + note. |
| ChEMBL | `[SA]` | May recommend **with** a ShareAlike/attribution caveat. |
| Human Protein Atlas (HPA) | `[SA]` | May recommend **with** a ShareAlike/attribution caveat. |
| PharmGKB (ClinPGx) | `[SA]` | May recommend **with** a ShareAlike/attribution caveat. |
