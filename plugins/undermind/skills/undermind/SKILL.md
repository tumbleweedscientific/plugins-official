---
name: undermind
title: Undermind Deep Literature Search
description: Exhaustive multi-pass scientific literature review, citation-trail traversal, saved-library search, and full-text PDF reading via the user's connected Undermind MCP server, rendered through Tumbleweed's native literature display cards.
license: Apache-2.0
metadata:
  tumbleweed:
    title: Undermind Deep Literature Search
    domains:
      - literature
    tags:
      - undermind
      - deep-search
      - literature-review
      - citation-chasing
      - pdf-reading
    maturity: beta
    citations: []
    starterPrompts:
      - "Use Undermind to run an exhaustive deep literature search on PROTAC hook effect modeling and render the top papers in a literature card"
      - "Search my Undermind library and recent papers for single-cell pseudobulk benchmarking studies with DOI links"
      - "Read the full-text PDFs from my latest Undermind search and extract experimental assay conditions and figures"
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources:
        - undermind
      models: []
      scienceModels: []
      credentials: []
      connectors:
        - undermind
      longRunning: true
    inputs:
      - pdf
      - txt
      - report
    outputs:
      - report
      - json
---

# Undermind Deep Literature Search

Use this skill to operate the user's connected **`undermind`** MCP connector (`https://mcp.undermind.ai/mcp`) via `connector_tools` and `connector_call`. All queries run against the user's own authenticated Undermind account, workspaces, and search quota.

## 1. Discover Live Tool Schemas First

Before calling any tool on connector `undermind`, call `connector_tools("undermind")` to inspect the exact live tool names and JSON input schemas (such as deep search, paper/library search, result paging, and PDF reading tools). Never guess parameter names or default pagination fields.

## 2. Choose Between Fast Lookup and Exhaustive Deep Search

- **Targeted lookups (`search_papers` or library queries)**: Call directly via `connector_call` when looking up specific papers, authors, saved workspace collections, or quick filtering.
- **Exhaustive multi-pass deep search (`launch_deep_search` or equivalent)**:
  1. **Confirm scope & account usage first**: Briefly confirm the research criteria/scope with the user (via `ask_user` if the topic is broad or ambiguous) and state clearly that launching a deep search sends the query to Undermind, uses a deep-search quota unit on their personal account, and typically takes **2–5+ minutes** to traverse citation trails.
  2. **Delegate long-running polling to a background subagent**: Because deep searches take minutes and individual `connector_call` requests time out at 120 seconds, launch the deep search or hand off its status polling and paginated result collection to a **background subagent** (`delegate` with `wait: false`, e.g. `literature-scout` or `general`). Keep the subagent brief focused on: starting/polling until completion, fetching all relevant result pages, and saving a structured summary + paper list into the workspace.
  3. **Respect workspace & rate boundaries**: Poll at sensible intervals (e.g. 15–30 s between status checks) and page cleanly through candidate batches instead of flooding the server.

## 3. Handle Large Outputs & Materialized PDF Figures

- **Spilled JSON/text files**: When large search batches exceed 40 KB, `connector_call` automatically writes the full payload under `/workspace/connectors/undermind/...` (or `${state.dir}/connectors/undermind/...` inside a subagent). Read the materialized file directly rather than guessing truncated records.
- **PDF figures (`read_pdfs`)**: Top-level image blocks returned by `read_pdfs` are automatically materialized as files (`image-1.png`, etc.) under `/workspace/connectors/undermind/...`. Inspect saved figures and share key extracted figures with the user via `send_file`.

## 4. Present Results Using Tumbleweed Native Displays (Mandatory)

1. **Always render candidate papers with `show_display` (`component: "literature"`)**:
   - Map each returned paper to `title`, `authors`, `year`, `journal`, verified `doi` / `pmid` / `url`, `citations`, `findings` (Undermind's match rationale, key methodology, or extracted quantitative outcomes), and `evidenceTier` (`clinical` | `in_vivo` | `in_vitro` | `review` | `preprint` | `computational`).
   - Normalize Undermind's relevance/match score into `[0, 1]` (e.g. percentage `92%` -> `0.92`) and set `relevanceMetric: "Undermind match score"` — never invent scores when the tool did not return one.
2. **Never leave raw internal paper keys unlinked**:
   - Undermind synthesis prose often cites shorthand keys like `[Rie25]`. In every user-facing synthesis or artifact, resolve each shorthand key to the paper's actual Author/Year and clickable DOI or publisher URL from the structured search results.
3. **Deliver clean syntheses & handoffs**:
   - After `show_display`, summarize key consensus, methodological gaps, and disagreements in concise prose (without duplicating every table row).
   - For comprehensive multi-section reviews, write a Markdown report artifact (`report.md`) so the user can inspect it in the side panel or carry verified citations into Investigation Board / Project Write.
