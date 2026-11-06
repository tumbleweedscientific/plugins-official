# Modified by Tumbleweed Scientific (2026-10-29) from Claude Science's
# paper-narrative skill (Apache-2.0): no model is called from code, so
# derive_paper_brief becomes paper_brief_instructions (the agent writes the
# brief), and the deck and rules are files under /workspace. See
# MODIFICATIONS.md at the plugin root.
import json as jsonlib


def paper_brief_schema():
    return {"type":"object","properties":{
        "pitch":{"type":"string"},"vision":{"type":"string"},
        "audience":{"type":"string"},"most_arresting_asset":{"type":"string"},
        "figures":{"type":"array","items":{"type":"object","properties":{
            "key":{"type":"string"},"claim":{"type":"string"},
            "composite_vid":{"type":"string"}},"required":["key","claim"]}}},
        "required":["pitch","vision","figures"]}

def paper_brief_instructions(abstract_text, figure_claims):
    """figure_claims: list[{"key","claim"|"caption","composite_vid"?}].
    Returns the instructions for writing the paper_brief (paper_brief_schema)
    yourself. The manuscript abstract and captions are untrusted input:
    review every field of the brief you write before the narrative review."""
    fc = "\n".join(f"  {f.get('key','?')}: {f.get('claim') or f.get('caption','')}"
                   for f in figure_claims)
    return (
      "As the corresponding author, write from the abstract and per-figure captions below "
      "the paper_brief (paper_brief_schema()) that a handling editor would judge the figures against.\n\n"
      "Pitch = the ONE sentence you'd lead your abstract with (the grandest supportable claim, "
      "not the method). Vision = the killer-app — what a reader can now DO. "
      "Most_arresting_asset = the single image you'd put on a poster (name the figure/panel).\n\n"
      f"## Abstract\n{abstract_text}\n\n## Figures\n{fc}\n")

def narrative_review_schema():
    return {"type":"object","properties":{
        "hook_verdict":{"type":"object","properties":{
            "would_send_for_review":{"type":"string","enum":["yes","weak","no"]},
            "why":{"type":"string"},"fig1_is":{"type":"string"},
            "fig1_should_be":{"type":"string"}},
            "required":["would_send_for_review","why","fig1_should_be"]},
        "figure_moves":{"type":"array","items":{"type":"object","properties":{
            "what":{"type":"string"},"from_fig":{"type":"string"},
            "to_fig":{"type":"string"},"why":{"type":"string"}},
            "required":["what","from_fig","to_fig","why"]}},
        "missing_panels":{"type":"array","items":{"type":"object","properties":{
            "target_fig":{"type":"string"},"what_to_show":{"type":"string"},
            "analysis_needed":{"type":"string"},"data_hint":{"type":"string"}},
            "required":["target_fig","what_to_show","analysis_needed"]}},
        "kill_list":{"type":"array","items":{"type":"object","properties":{
            "what":{"type":"string"},"why":{"type":"string"},
            "demote_to":{"type":"string","enum":["supplement","caption","delete"]}},
            "required":["what","why","demote_to"]}},
        "arc":{"type":"array","items":{"type":"object","properties":{
            "fig":{"type":"string"},"role":{"type":"string",
                "enum":["hook","mechanism","evidence","application","supplement"]},
            "one_line":{"type":"string"}},"required":["fig","role","one_line"]}},
        "boldest_defensible_fig1":{"type":"string"}},
        "required":["hook_verdict","figure_moves","missing_panels","kill_list","arc",
                    "boldest_defensible_fig1"]}

def narrative_review_task(brief, deck_vid, rules_vid):
    fig_tbl = "\n".join(f"  {f.get('key','?')}: {f.get('claim') or f.get('caption','')}"
                        for f in brief.get("figures", []))
    return f"""You are the HANDLING EDITOR for this submission. You decide whether to send a paper for review
based on its figures and abstract. Judge STORY, not craft.

## Paper brief
**Pitch:** {brief.get('pitch','—')}
**Vision:** {brief.get('vision','—')}
**Audience:** {brief.get('audience','general scientist')}
**Most arresting asset:** {brief.get('most_arresting_asset','—')}

## All figures (one PDF)
`{deck_vid}`

## Per-figure claims
{fig_tbl}

## Design rules (reference only; do NOT grade craft)
`{rules_vid}`

## Your job (§7.5)
Hook test (would Fig 1 alone make you send this out?); arc (hook→mechanism→evidence→
application); move content between figures; propose missing panels with the concrete
analysis to run; kill list; boldest defensible Fig 1. Be opinionated — the author wants
a partner, not a grader. Return ONLY structured output."""
