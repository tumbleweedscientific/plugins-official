---
name: research-grants
title: Research Grant Proposal Writing (NSF/NIH/DOE/DARPA)
description: Drafts and audits competitive research grant proposals for NSF, NIH, DOE, and DARPA including Specific Aims, Project Summaries, Intellectual Merit & Broader Impacts, Research Strategy narratives, milestones, and budget justifications.
license: MIT
metadata:
  tumbleweed:
    domains:
      - writing
      - literature
    tags:
      - grants
      - nih
      - nsf
      - proposals
    maturity: stable
    citations: []
    starterPrompts:
      - Use research-grants to draft an NIH R01 Specific Aims page using the NIH guidelines and template.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources:
        - grants-gov
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
    inputs:
      - txt
      - report
      - pdf
    outputs:
      - report
      - txt
---

# Research Grant Proposal Writing

Prepare structured, reviewer-calibrated research proposals tailored to **NSF**, **NIH**, **DOE**, and **DARPA** funding mechanisms.

## Agency Alignment

- **NSF (`references/nsf_guidelines.md`, `references/broader_impacts.md`)**: Balance *Intellectual Merit* and *Broader Impacts* explicitly; follow 15-page Project Description conventions and 1-page Project Summary templates (`assets/nsf_project_summary_template.md`).
- **NIH (`references/nih_guidelines.md`, `references/specific_aims_guide.md`)**: Anchor the proposal on a rigorous 1-page Specific Aims (`assets/nih_specific_aims_template.md`) separating conceptual innovation, testable hypotheses across Aims, preliminary feasibility, rigor/reproducibility, and potential pitfalls + alternative strategies.
- **DOE (`references/doe_guidelines.md`)**: Align scope with Office of Science / ARPA-E energy, computation, or foundational physical/biological mission metrics, milestones, and data management.
- **DARPA (`references/darpa_guidelines.md`)**: Frame proposals around Heilmeier Catechism metrics, quantitative technical risk retirement, Go/No-Go phase gates, and aggressive yet credible schedules.
- **Budgets (`assets/budget_justification_template.md`)**: Tie personnel effort, compute, reagents, equipment, and subawards directly to experimental Aims with realistic scope.

## Workflow

1. Confirm target agency, funding mechanism (e.g., NIH R01/R21, NSF CAREER/Standard, DOE FOA, DARPA BAA), page caps, and submission scope.
2. Verify supporting preliminary-literature claims via `literature_search` / `literature_read` before citing prior work (`grants-gov` connector tools may also be used when searching active federal opportunities).
3. Consult the matching `references/*.md` guide and `assets/*.md` template to outline section budgets and review criteria.
4. Pair qualitative approach sections with crisp experimental tables, timelines/milestones, and risk-mitigation blocks; use quantitative charts or `figure-composer` when conceptual schematics improve proposal clarity.
5. Perform a final reviewer-criteria check against NIH Significance/Innovation/Approach or NSF Merit Review criteria before delivery.
