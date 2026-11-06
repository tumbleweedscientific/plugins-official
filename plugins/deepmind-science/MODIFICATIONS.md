# Modifications

Adapted on 2026-11-06 from `google-deepmind/science-skills`
(`skills/`, commit `4de6786171f1479026da5d3a00f110703c8ba35e`, Apache-2.0),
the first batch of ADR 0041's import. Every modified file says so below its
frontmatter.

| Skill | Changes |
| --- | --- |
| `uv` | `license` and `metadata.tumbleweed` added; on Tumbleweed's sandboxes uv is installed with `pip` (PyPI is a default host) before the upstream shell installer. |
| `uniprot_database`, `pubmed_database`, `chembl_database`, `ensembl_database` | `license` and `metadata.tumbleweed` (domains, requirements, data sources, outputs, citations, starter prompts) added to the frontmatter. Text and scripts unchanged. |

Not included yet: the other 35 skills of the collection (see the monorepo's
`docs/plugins/collected-skills-inventory.md`); the AlphaGenome skills need
an AlphaGenome API key the platform does not hold.
