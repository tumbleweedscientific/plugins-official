# Modifications

`tumbleweed-research` is the built-in plugin of the research agent
(ADR 0025, amendment "Built-in plugins of agents"). Its skills were adapted on
2026-10-29 from the sources below; every modified file says so at its top.
`RUNTIME.md` (new) maps the original hosts' tools and APIs to this platform.

## From Claude Science 0.1.70 (Apache-2.0)

| Skill | Changes |
| --- | --- |
| `literature-review` | `kernel.py`: the host SDK calls are gone — the Crossref contact e-mail comes from `LITREV_CONTACT_EMAIL`, the OpenAlex key from `OPENALEX_API_KEY` (without one, OpenAlex steps raise and the review continues with Crossref, NCBI, Europe PMC or connectors); the User-Agent names this platform. `SKILL.md`: how to load the kernel, connectors instead of `search_skills`, the `artifacts` tool, Europe PMC as the citation walk without OpenAlex. |
| `indication-dossier` | Tools table mapped to connectors and public APIs called from the sandbox; sub-agents replaced by sequential steps; work directory under `/workspace`; the report is also published with `artifacts`. Reference files: a note on the sequential steps and tool equivalents. |
| `pdf-explore` | Rewritten around helpers without model calls. Kept: `pdf_pages` (install hints and cache directory changed). Removed: `pdf_scan`, `pdf_map`, `pdf_extract` and the model fallback of `pdf_outline`, which fanned pages out to a model. Added: `pdf_search` (BM25), `pdf_grep`, `pdf_write_pages`, `pdf_crop`, and heading heuristics for `pdf_outline`. `SKILL.md` rewritten for these helpers. |
| `figure-style` | `kernel.py`: adds `save_panel_crops` (crops written as PNGs to look at with `read`, in place of the host's image crop); `SKILL.md`: kernel loading and §9.2 with it. |
| `figure-composer` | No sub-agents: panels are rendered one at a time and the composite review is done by the agent, following the same task texts and schemas. `kernel.py`: `derive_outline` (a model call) replaced by `outline_instructions`; artifact ids replaced by file paths. |
| `paper-narrative` | No sub-agents or model calls: the agent writes the paper brief (`paper_brief_instructions` replaces `derive_paper_brief`) and the handling editor's review; files instead of artifact ids. |
| `proteinmpnn`, `ligandmpnn`, `solublempnn` | A note that they run on the sandbox's CPU only, with outputs under `/workspace`; GPU and remote-compute mentions do not apply. |

## From Anthropic's skill-creator (Apache-2.0, `skills/skill-creator/LICENSE.txt`)

Runs in the skill's own no-sub-agent mode; `scripts/run_eval.py`,
`scripts/run_loop.py` and `scripts/improve_description.py` (which call the
`claude` CLI) are removed and the description step is done by hand; the Cowork
section is replaced by "On Tumbleweed Scientific" (work in `/workspace`,
package to `/workspace/<name>.skill`).

## 2026-11-05/06: moved to plugins-official (ADR 0041)

- Every SKILL.md: `metadata.tumbleweed` (domains, requirements, data sources,
  formats, citations, starter prompts) added to the frontmatter; licences
  unchanged.
- The user confirmed on 2026-11-06 that the Claude Science skills may be
  used here (each skill's frontmatter states `license: Apache-2.0`).
- Claude Science's GPU model skills are in the separate `science-models`
  plugin.

## Not included, and why

- GPU models of Claude Science: in the `science-models` plugin, listed as
  unavailable until a GPU backend exists.
- Claude Science's own host features (compute-env-setup, remote-compute-*,
  managed-model-endpoints, using-model-endpoint, customize, self-awareness,
  product-self-knowledge) and its skill-creator variant: they drive that
  application's APIs.
- `scvi-tools`: the bio-research plugin ships a skill of the same purpose.
- docx, pdf, xlsx, pptx (Anthropic, "All rights reserved"), the Claude
  Desktop example skills without a license, and `dataviz` (not distributed
  as files): their terms do not allow copying.
