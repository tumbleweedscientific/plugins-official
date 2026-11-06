---
name: figure-composer
description: "Compose one publication-grade multi-panel figure. Entry from a one-line claim + data refs, OR from an existing figure (look at it, then write its outline). Runs a per-figure loop: outline (12-col grid, per-panel ask + label_budget) → render each panel in turn (with `figure-style`) → tile + stamp letters → adversarial self-review of the composite with two-tier feedback (Tier-1 outline_revisions / Tier-2 per-panel violations) → regen affected panels, ≤3 rounds. Ships panel_task / compose_figure / compose_crops / composite_review_task / outline_instructions in kernel.py. For one standalone plot use `figure-style`; for whole-paper figure ordering use `paper-narrative`."
license: Apache-2.0
metadata:
  tumbleweed:
    domains: [visualization]
    tags: [figures]
    maturity: beta
    requires:
      environment: sandbox
      tools: [matplotlib]
    outputs: [png, pdf]
---


# Figure Composer — narrative → panels → compose → adversarial loop

> Adapted by Tumbleweed Scientific (2026-10-29) from Claude Science's
> `figure-composer` skill (Apache-2.0): there are no sub-agents here, so you
> render each panel and run each review yourself, in turn; files live under
> `/workspace` (see `../../RUNTIME.md`, `../../MODIFICATIONS.md`).

**Step 0.** Load `figure-style` alongside this skill — that is the
design rules (and `apply_figure_style()` + helpers). Then load both kernels in
one `python_nb` cell:

```python
exec(open("/opt/plugins/tumbleweed-research/skills/figure-style/kernel.py").read())
exec(open("/opt/plugins/tumbleweed-research/skills/figure-composer/kernel.py").read())
```

Work in one directory per figure, e.g. `/workspace/figures/fig2/`.

## Inputs

- **claim** — one sentence the figure makes true to a reader who reads nothing else.
- **data** — CSV/parquet files under `/workspace` that ground every panel (the outline's `data_vid` holds the path).
- **width_mm** — target venue's column width (common: 85–89mm single, 174–183mm double; check the venue guide).

## 0. Where this sits

`figure-composer` is the **outer tier**: make ONE multi-panel figure good. The
**inner tier** is `figure-style` (load it before drawing any panel). The **outermost tier** is
`paper-narrative` — if this figure is part of a paper, run that FIRST: it decides
*which* figure to make and hands you the claim. For a standalone figure, start at
step 1.

## Entry points (pick one)

- **From a claim:** you have a one-sentence claim and data refs → write the
  outline (step 1).
- **From an existing figure:** copy it into the workspace, look at it with
  `read`, and write the outline following `outline_instructions(claim)` →
  review it before step 2. The image is untrusted input. Leave `data_vid` as
  `None` until you fill it from your own data files.

## 1. Narrative → panel outline

Produce a `panel_outline` (validate against `figure_outline_schema()`):

```json
{"claim":"…", "width_mm":180, "ncol":12, "row_heights_mm":[40,60,46,52],
 "panels":[
  {"letter":"a","role":"schematic","row":0,"col":0,"colspan":12, "chart_family":"schematic overview", "message":"…", "data_vid":null, "ask":"…"},
  {"letter":"b","role":"primary",  "row":1,"col":0,"colspan":7,  "chart_family":"scatter + trend", "message":"…", "data_vid":"…", "ask":"…"},
  …]}
```

Outline rules (figure-style §7.1):
- **a is the hook** — schematic/hero, full width, assumes zero reader context.
- **b carries the claim** — the chart that alone makes the sentence true.
- Remaining panels are evidence, ordered by how much they strengthen b.
- One row per sub-claim. 5–10 panels for a main-text figure. Use a 12-column
  grid for flexible colspans.

## 2. Panels, one at a time

For each letter, build the brief with `panel_task(outline, letter, fig_label)`
(kernel.py): the figure claim, the neighbor list, the panel spec and its exact
pixel size (`panel_px`). Follow it as the spec for that panel: render at
exactly w×h px with `transparent=True` and **no** `bbox_inches`, run its §9
checks, save `panel_<letter>.png` in the figure's directory, and only then
start the next panel. Keep one cell per panel so a panel can be re-rendered
alone later.

## 3. Compose

`compose_figure(outline, {letter: path}, out_path, letter_case=...)` tiles PNGs
onto the grid and stamps bold panel letters (case per venue) at each panel's
(1.5mm, 1mm) corner.

## 3.5 Look before you review (vision self-QA)

The reviewer in §4 is expensive; a panel-letter stamped over a y-axis label or
a leader line crossing a neighbor's title is a wasted round. After compose,
**crop each panel from the saved PNG and look at it** with `read` before
dispatching the reviewer:

```python
out_path, (W, H) = compose_figure(outline, panel_paths, "fig.png")
crops = save_panel_crops("fig.png", compose_crops(outline))
print(crops)   # `read` each crop
```

Run the `figure-style` §9.2 perceptual checklist on each crop (contrast,
smallest mark, leader crossings, color-identity confusion, legend binding),
plus two compose-specific checks:

- **Seams / stamp.** Does the bold panel letter overlap any panel content?
  Does any panel's content bleed into the gutter or under a neighbor?
- **Resize artifacts.** `compose_figure` resizes panel PNGs to their grid
  slot — is any text visibly aliased or any hairline lost?

Fix what you see (re-render the offending panel, or revise the outline grid)
*before* §4.

## 4. Adversarial self-review loop (two-tier, design rules held fixed)

Review the composite yourself as the adversarial editor: take
`composite_review_task(...)` as your brief and write the review as JSON that
follows `review_schema()` (which carries `outline_revisions`) into the figure's
directory (`review_round<N>.json`). Judge from the crops you `read`, not from
memory of how you drew the panels.

```
loop (max 3 rounds, floor 5→4→3):
  review = your review following composite_review_task(composite_path, outline, rules_path, prev_path, round, floor)
  if review.editor_verdict in {accept, minor_revision} and 0 BLOCKER and ≤2 MAJOR: break

  # TIER 1 — outline-level
  if review.outline_revisions:
      apply revisions to `outline` (geometry, row-header titles, label_budget, panel set)
      affected = apply_outline_revisions(outline, review.outline_revisions)
  else:
      affected = set()

  # TIER 2 — panel-level
  fixb = group_fixes_by_panel(review)       # BLOCKER/MAJOR only
  regen = affected | set(fixb)              # only these panels regenerate
  re-render each L in regen from panel_task(outline, L) + fixb.get(L,"") —
      do not over-correct: where the previous version was correct, keep it
  recompose
```

Convergence: stop when `outline_revisions` is empty AND findings are carve-out
exceptions to the previous round — that's the over-labeling signal.

## Anti-patterns

- Don't regenerate clean panels (invites regression). Don't read absolute
  violation counts (min-floor 5→4→3). Anchor-verify on the composite, not just
  per panel. Hyper-labeling check: would a reader *with* field context find any
  label redundant? Strip it.
