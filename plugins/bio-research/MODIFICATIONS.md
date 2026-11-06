# Modifications

This plugin is a copy of `bio-research` from
[anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
at commit `2574e29377c7173d0cecffef29a6ecbd7f8ccb5d`, licensed under the Apache License 2.0 (see `LICENSE`).

Tumbleweed Scientific changed these files on 2026-10-28:

- `.mcp.json`: removed the `benchling` server, whose URL was empty.
- `CONNECTORS.md`: the Benchling row reflects that removal; a notice at the top
  points here.
- `MODIFICATIONS.md`: added (this file).

All other files are unchanged.

## 2026-11-05: moved to plugins-official (ADR 0041)

- `.claude-plugin/plugin.json`: `license` and `metadata.tumbleweed` (domains,
  connectors' data sources and terms) added.
- Every `skills/*/SKILL.md`: `license: Apache-2.0` and `metadata.tumbleweed`
  (domains, requirements, input and output formats, citations, starter
  prompts) added to the frontmatter. The skills' text is unchanged.
