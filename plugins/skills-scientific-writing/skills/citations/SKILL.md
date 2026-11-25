---
name: citations
title: Citations & BibTeX Verification
description: Resolves, verifies and formats references so every citation is confirmed against Crossref, OpenAlex, arXiv or PubMed before entering a bibliography, builds BibTeX from resolved metadata, and audits existing .bib files for fabricated or mismatched entries.
license: MIT
metadata:
  tumbleweed:
    domains:
      - writing
      - literature
    tags:
      - citations
      - bibtex
      - crossref
      - verification
    maturity: stable
    citations: []
    starterPrompts:
      - Use citations to verify and audit all references in references.bib against Crossref DOIs.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - python
      dataSources:
        - arxiv
        - pubmed
      models: []
      scienceModels: []
      credentials: []
      network:
        - api.crossref.org
      longRunning: false
    inputs:
      - txt
      - tex
      - report
      - pdf
    outputs:
      - txt
      - tex
      - report
---

# Citations & BibTeX Verification

A citation is a claim that a specific document says a specific thing. Nothing enters the bibliography unless resolved from a live bibliographic record, and nothing is cited for a specific finding without reading the underlying abstract or passage (`literature_read` / `read_document`).

## Non-negotiables

1. **Resolve before you cite.** Confirm every reference using `literature_search` or live Crossref/OpenAlex/arXiv/PubMed records (`references/apis.md` documents the exact query formats). Never recall DOIs, authors, venues, or years from memory.
2. **Read before you attribute.** Cite a finding or quantitative number only after confirming it in the abstract or paper text via `literature_read`.
3. **One canonical identifier per entry.** Prefer the publisher DOI; use arXiv ID for unrefereed preprints (`@misc` with `eprint` and `archivePrefix = {arXiv}`), keeping PMIDs as secondary fields. Keep BibTeX keys (`firstauthorYEARkeyword`) stable once cited.
4. **Prefer published records over preprints** when a journal/proceedings version exists, and note explicitly if numbers come from a preprint revision.
5. **Report unresolved entries honestly** instead of guessing or fabricating bibliographic fields.

## Workflow

1. Collect the claims requiring citations or inspect the existing `.bib` file in `/workspace/`.
2. Resolve each reference via `literature_search` or Crossref/OpenAlex (`references/apis.md`).
3. Confirm claim support via `literature_read`.
4. Write clean BibTeX entries (`@article`, `@inproceedings`, `@misc`, `@book`, `@techreport`), preserving capitals with braces (`{BERT}`, `{Transformer}`), keeping `doi` and `url`, and omitting `abstract`/`keywords`.
5. Audit the `.bib` file in the sandbox with:
   ```bash
   python scripts/validate_bib.py references.bib
   ```
   (Add `--offline` when only structural/duplicate checks are needed.)
6. Deliver resolved, corrected, and unresolved items clearly, and confirm every `\cite` key matches the `.bib` file.
