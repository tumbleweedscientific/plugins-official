# Modifications

- Selected only the 5 net-new scientific writing, grant, review, citation, and presentation skills that do not overlap with built-in `tumbleweed-research` skills.
- Replaced OpenScience CLI tool names (`webfetch`, `research_search`, `explore` task tool, `research-lookup`) with Tumbleweed built-in tools (`literature_search`, `literature_read`, `read_document`, `web_fetch`, and `reviewer`/`literature-scout` subagents).
- Removed OpenRouter / external Nano Banana image-generation scripts (`generate_slide_image.py`, `generate_slide_image_ai.py`) from `scientific-slides` and updated `validate_presentation.py` to use `pypdf` from the Tumbleweed bioinformatics/scientific sandbox image.
- Updated script path references inside `scientific-slides` and `citations` to skill-relative paths (`scripts/...`, `references/...`) per Tumbleweed skill isolation rules.
