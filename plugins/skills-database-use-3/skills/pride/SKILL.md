---
name: pride
description: Submit compact PRIDE Archive API requests for proteomics project discovery and project-level metadata. Use when a user wants concise PRIDE summaries
metadata:
  tumbleweed:
    domains:
    - proteomics
    tags:
    - pride
    - database-use
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use pride: Submit compact PRIDE Archive API requests for proteomics project discovery and project-level metadata.'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - python
      - requests
      dataSources:
      - pride
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network: []
    inputs:
    - json
    outputs:
    - json
    title: PRIDE
license: Apache-2.0
---

# Operating rules
- Use `scripts/rest_request.py` for all PRIDE Archive calls.
- Use `base_url=https://www.ebi.ac.uk/pride/ws/archive/v2`.
- Start with `projects` for discovery and keep page sizes modest.
- Prefer project-level metadata lookups over broad archive dumps.
- Re-run requests in long conversations instead of relying on older tool output.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return raw JSON only if the user explicitly asks for machine-readable output.
- Prefer these paths: `projects` and `projects/<PXD accession>`.

## Input
- Read one JSON object from stdin.
- Required fields: `base_url`, `path`
- Optional fields: `method`, `params`, `headers`, `json_body`, `form_body`, `record_path`, `response_format`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common PRIDE patterns:
  - `{"base_url":"https://www.ebi.ac.uk/pride/ws/archive/v2","path":"projects","params":{"keyword":"proteomics","pageSize":10},"max_items":10}`
  - `{"base_url":"https://www.ebi.ac.uk/pride/ws/archive/v2","path":"projects/PXD001357"}`

## Output
- Success returns `ok`, `source`, `path`, `method`, `status_code`, `warnings`, and either compact `records` or a compact `summary`.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` and `error.message`.

## Execution
```bash
echo '{"base_url":"https://www.ebi.ac.uk/pride/ws/archive/v2","path":"projects","params":{"keyword":"proteomics","pageSize":10},"max_items":10}' | python scripts/rest_request.py
```

## References
- No additional runtime references are required; keep runtime files limited to this file and `scripts/rest_request.py`.
