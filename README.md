# plugins-official

Tumbleweed Scientific's official, reviewed plugins: skills, connectors
(remote MCP servers), commands and Specialists for life-science research.
The platform's catalogue follows this repository: every commit merged to
`main` that passes the checks below is imported within minutes (ADR 0041 of
the platform). The repository is also a Claude Code marketplace
(`.claude-plugin/marketplace.json`).

```
.claude-plugin/marketplace.json  every plugin, its status and our review (metadata.tumbleweed)
plugins/<name>/                  one plugin in Claude's layout, plus research metadata
connectors/                      the MCP servers we host on Cloudflare Workers
schema/                          JSON Schemas and the controlled vocabularies
tools/plugins-lint.mjs           the platform's own checks, bundled (do not edit)
.github/workflows/validate.yml   runs them on every pull request
```

## Validate locally

```bash
node tools/plugins-lint.mjs .
```

It runs exactly what the import runs: the marketplace and vocabularies parse;
every listed plugin normalizes (no hooks, no stdio MCP servers, at most 200
files and 20 MB, prompt files at most 64 KB); research metadata is valid and
its terms are in `schema/vocabularies.json`; every plugin and skill carries an
accepted SPDX licence, the plugin a LICENSE file, adapted content NOTICE and
MODIFICATIONS.md; nothing looks like a secret; no plugin directory is
unlisted. Editors validate the metadata against `schema/*.schema.json`.

## Research metadata

In `plugin.json` under Claude's free-form `metadata` (Claude ignores it), and
in each SKILL.md's frontmatter; licences use the standard `license` fields.

```yaml
license: Apache-2.0
metadata:
  tumbleweed:
    domains: [single-cell, transcriptomics]
    tags: [scanpy, qc]
    maturity: stable            # stable | beta | experimental
    citations: ["Wolf et al., Genome Biol 2018, doi:10.1186/s13059-017-1382-0"]
    starterPrompts: ["Run QC on my 10x h5ad and flag low-quality cells"]
    requires:
      environment: sandbox      # web | sandbox
      image: bioinfo            # an environment id, when it needs one
      resourceClass: large      # standard | large
      gpu: false
      tools: [scanpy, anndata]  # vocabulary; checked against the image's tools.json
      dataSources: [geo]        # vocabulary; any connector serving the source satisfies it
      models: [vision]          # capabilities the conversation's model needs
      scienceModels: []
      credentials: []           # requirement ids of the plugin's review
      longRunning: false
    inputs: [h5ad, 10x-h5]      # vocabulary of formats
    outputs: [h5ad, png, report]
```

A connector's metadata goes in `plugin.json` →
`metadata.tumbleweed.connectors.<server>`: `dataSources`, `domains`,
`rateLimit`, `terms` (https URL), `region`, `cost`.

## Status

`metadata.tumbleweed.status` of each marketplace entry: `listed` (offered),
`withdrawn` (not offered; installations keep working; the directory may be
removed) or `revoked` (stops working at the next request). Rolling back is a
revert.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the review checklist. Licensed
under Apache-2.0 (LICENSE); adapted plugins keep their upstream licence and
NOTICE.
