# Modifications

`tumbleweed-research` is the built-in plugin of the research agent (ADR 0025,
amendment "Built-in plugins of agents"); since ADR 0041 it lives in this
repository. Every modified file says so at its top.

## From Anthropic's skill-creator (Apache-2.0, `skills/skill-creator/LICENSE.txt`)

Runs in the skill's own no-sub-agent mode; `scripts/run_eval.py`,
`scripts/run_loop.py` and `scripts/improve_description.py` (which call the
`claude` CLI) are removed and the description step is done by hand; the Cowork
section is replaced by "On Tumbleweed Scientific" (work in `/workspace`,
package to `/workspace/<name>.skill`). 2026-11-05: `metadata.tumbleweed`
added to the frontmatter.

## Tumbleweed Scientific's own

`bioinfo-figure-deconstruction`: authoring metadata removed from the
frontmatter; a section on viewing figures on this platform; 2026-11-05:
`license` and `metadata.tumbleweed` added.

## Not in this repository, and why

The nine skills adapted from Claude Science 0.1.70 in the monorepo copy
(literature-review, indication-dossier, pdf-explore, figure-style,
figure-composer, paper-narrative, proteinmpnn, ligandmpnn, solublempnn) were
taken from the Claude Science application bundle. Their frontmatter says
`license: Apache-2.0`, but the bundle itself ships no licence grant and its
SOURCE.json records an extraction from a proprietary application (ADR 0041,
"Licences of the collected skills"). They stay out until the redistribution
right is confirmed with the rights holder.
