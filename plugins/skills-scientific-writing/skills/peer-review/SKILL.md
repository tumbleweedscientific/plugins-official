---
name: peer-review
title: Calibrated Scientific Peer Review
description: Reviews a manuscript, proposal, analysis or result like a careful referee—reading the full artifact, checking methods against claims, statistics against study design, figures against numbers, and separating BLOCKING issues from observations with a calibrated recommendation.
license: MIT
metadata:
  tumbleweed:
    domains:
      - writing
      - literature
    tags:
      - peer-review
      - critique
      - statistics
      - reproducibility
    maturity: stable
    citations: []
    starterPrompts:
      - Use peer-review to audit this manuscript PDF and list BLOCKING issues vs minor observations.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
    inputs:
      - pdf
      - tex
      - report
      - txt
    outputs:
      - report
---

# Calibrated Scientific Peer Review

A review tells authors and editors whether the evidence supports the claims as worded and what concrete revisions would resolve any gaps. Read everything available, recompute what can be checked, and separate **BLOCKING** issues from **Observations**.

## Non-negotiables

1. **Read the whole artifact**, including methods, appendices, supplementary tables, and attached analysis scripts (`read_document` / `literature_read`). Never review only the abstract and intro.
2. **Check, do not just skim.** Verify statistical tests match design (paired vs unpaired, multiple testing, pseudoreplication), confirm text numbers match tables/figures, and trace leakage or baseline fairness.
3. **Classify every point as BLOCKING or OBSERVATION.** Blocking means the central claim is unsupported as written; observations improve clarity or rigor without invalidating the main conclusion.
4. **Locate every issue** precisely (Section, page, table, figure, equation, or code file) and pair every blocking point with a concrete resolution.
5. **Calibrate tone and verdict** against `references/calibration.md` and `references/scoring-rubric.md`. Do not over-penalize narrow scope or honestly acknowledged limitations.

## Workflow & Reference Guides

1. Summarize the study's central claims and stated scope in three sentences.
2. Audit claim-by-claim evidence against `references/evidence-hierarchy.md`.
3. Check methodology, confounding, and statistical assumptions using `references/statistical-pitfalls.md`, `references/common-issues.md`, `references/common-biases.md`, and `references/logical-fallacies.md`.
4. Inspect figures, numerical consistency, and reporting checklists (`CONSORT`, `PRISMA`, `ARRIVE`) via `references/paper-mechanics.md` and `references/reporting-standards.md`.
5. For grant critiques, consult `references/reviewer-expectations.md`.
6. When a long manuscript or high-stakes draft benefits from an independent second pass, delegate a focused read-only critique (e.g. statistics or leakage audit) to a subagent and reconcile blocking findings directly without averaging them away.

## Report Structure

```markdown
## Summary
Three sentences: what the work claims, what it does, and what the evidence shows.

## Blocking
1. [Section/Table] Issue. Why it undermines the claim. Concrete fix or control experiment.

## Observations
- [Location] Constructive suggestion.

## Recommendation
Accept / Minor revision / Major revision / Reject — tied explicitly to the Blocking list, with Confidence (high / medium / low) and unchecked items disclosed plainly.
```
