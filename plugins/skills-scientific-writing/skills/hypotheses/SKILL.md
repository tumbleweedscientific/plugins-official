---
name: hypotheses
title: Falsifiable Hypotheses & Experiment Design
description: Turns a research direction into falsifiable, mechanistic hypotheses paired with competing explanations (confounds/nulls), sample-size/power reasoning, pre-specified analysis rules, and the smallest discriminating experiment that separates them.
license: MIT
metadata:
  tumbleweed:
    domains:
      - writing
      - literature
    tags:
      - hypothesis-generation
      - experimental-design
      - statistical-power
    maturity: stable
    citations: []
    starterPrompts:
      - Use hypotheses to formulate competing mechanistic hypotheses and a discriminating experiment plan.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
    inputs:
      - txt
      - report
      - csv
    outputs:
      - report
---

# Falsifiable Hypotheses & Discriminating Experiments

A hypothesis is a statement the world could contradict, paired with the exact observation that would contradict it. Convert broad research directions into explicit competing explanations and minimal discriminating tests.

## Rules

1. **Falsifiable, specific, mechanistic.** State direction, regime/condition, proposed mechanism, and observable falsifying outcome (`references/quality-criteria.md`).
2. **Always include competitors.** Pair the primary hypothesis with at least one plausible competing explanation (confound, technical artifact, or simpler alternative) plus the null.
3. **Pre-specify predictions and analysis before data.** Define primary outcome, statistical test, multiple-comparison correction, outlier/missing-data rule, and decision criteria before looking at outcomes.
4. **Power the design honestly.** Choose sample size / replicates / random seeds from pilot variance and minimum detectable effect (MDE); explicitly state what effect sizes are underpowered.
5. **Control alternatives.** Randomize assignment, block nuisance covariates, hold evaluation metrics fixed across arms, and include positive/negative controls (`references/design-patterns.md`, `references/experimental-design.md`).
6. **Order by information per unit cost.** Run the cheapest discriminating check that can eliminate a hypothesis first.

## Deliverable Format

```markdown
## Question & Prior Evidence
## Hypotheses
- H1: <statement>. Mechanism: <...>. Predicts: <if true> / Falsified by: <if false>.
- H2 (competing / confound): ...
- H0 (null): ...
## Discriminating Experiment
- Design, arms, controls, randomization/blocking, and fixed evaluation.
- Sample size / replicates: n=<value>, MDE=<value> at power=<p>.
- Pre-specified primary outcome, statistical model/test, and verdict decision rule.
## Sequenced Experiment Order & Confound Risks
```
