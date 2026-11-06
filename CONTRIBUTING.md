# Contributing a plugin

A merged pull request is the review: what merges is imported by the platform
within minutes, for every user. The validate workflow must pass; a reviewer
checks what it cannot.

## Add or change a plugin

1. Put the plugin in `plugins/<name>/` in Claude's layout
   (`.claude-plugin/plugin.json`, `skills/<skill>/SKILL.md`, `.mcp.json` with
   `http` or `sse` servers, `agents/*.md`, `commands/*.md`). `name` is
   `[a-z0-9-]`, permanent once listed, and equal to the entry's name.
2. Add research metadata (README) to `plugin.json` and every SKILL.md, with
   terms from `schema/vocabularies.json`. A new term goes into the vocabulary
   in the same pull request.
3. Add or update the entry in `.claude-plugin/marketplace.json`:
   `"source": "./plugins/<name>"` and `metadata.tumbleweed` with `origin`
   (`official`: users install it; `builtin`: an agent names it in code),
   `status`, `featured`, `upstream` for adapted content, and `review`.
4. `node tools/plugins-lint.mjs .` passes.

## Review checklist

- [ ] **Licence.** Every plugin and skill states an SPDX licence that allows
      redistribution of modified copies. Adapted content keeps the upstream
      LICENSE and NOTICE, records its upstream (repository, path, commit) in
      `upstream`, and MODIFICATIONS.md says what changed; modified files say
      so at their top. Content without a confirmed redistributable licence
      does not enter the repository (an application bundle is not a licence).
- [ ] **What runs.** No hooks, no stdio MCP servers, no LSP servers; scripts
      only in skills; nothing downloads and runs unpinned code beyond what
      the skill's text tells the agent to install.
- [ ] **Network.** `review.network` lists every host the skills' scripts
      reach (granted at install, ADR 0018); MCP URLs are https.
- [ ] **Credentials.** Every `${VAR}` of `.mcp.json` headers maps to a
      `review.credentials` entry; OAuth servers are in `review.oauth`; no
      secret is in the files.
- [ ] **Specialists.** `review.specialists` states our tool names for every
      agent file.
- [ ] **Connectors.** `review.connectors` gives each server a title and
      description; `unavailable` explains servers we cannot connect yet.
      Data-source terms in the plugin's metadata are honest: a source a
      connector serves, a terms URL for it.
- [ ] **Requirements.** `requires` says what the skill really needs: GPU,
      tools that are not in the image, data sources, long runs. A skill that
      cannot run anywhere yet is listed as unavailable, not hidden.
- [ ] **Text.** Skill text guides a task; it does not tell the agent to
      ignore its instructions, exfiltrate data or contact hosts it does not
      need.

## Connectors we host

`connectors/src/<name>/` is a Cloudflare Worker serving one MCP endpoint
for a group of public APIs; `connectors/README.md` states the sources, their
terms and attribution, the rate limits and the caching. They share one
package and one `npm test`, which the workflow runs. Deploying is a separate
step that needs the owner's approval.
