---
name: bionemo-protein-binder-design
title: De Novo Protein Binder Design (Hosted BioNeMo)
description: Design and filter de novo protein binders end-to-end using hosted NVIDIA BioNeMo NIMs (RFdiffusion backbones, ProteinMPNN sequences, Boltz-2/OpenFold3 complex refolding) combined with local BioPython/RDKit interface and sequence-diversity triage.
license: CC-BY-4.0
metadata:
  tumbleweed:
    domains:
      - protein-design
      - structural-biology
    tags:
      - bionemo
      - binder-design
      - rfdiffusion
      - proteinmpnn
      - boltz2
    maturity: experimental
    citations: []
    starterPrompts:
      - Use bionemo-protein-binder-design to set up a bounded 4-candidate RFdiffusion -> ProteinMPNN -> Boltz-2 binder campaign against a target PDB.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - python
        - biopython
        - rdkit
        - numpy
        - pandas
      dataSources:
        - nvidia-bionemo
      models: []
      scienceModels: []
      credentials:
        - nvidia-nim
      connectors:
        - nvidia-bionemo
      network: []
      longRunning: true
    inputs:
      - pdb
      - mmcif
      - fasta
    outputs:
      - mmcif
      - pdb
      - csv
      - json
      - report
---

# De Novo Protein Binder Design (Hosted BioNeMo Campaign)

Use this skill for an end-to-end computational protein binder design campaign driven by NVIDIA BioNeMo NIMs (`rfdiffusion` -> `proteinmpnn` -> `boltz2` or `openfold3`) through the **`nvidia-bionemo`** connector, paired with sandbox Python/BioPython analysis to clean targets, define hotspots, deduplicate sequences, and compute interface contacts.

Adapted from NVIDIA BioNeMo Agent Toolkit (`bionemo-agent-toolkit` commit `0e67a612e4045f007e38fa77adc8f3ebfc5616b6`). All binder rankings and complex confidence scores are computational predictions requiring experimental validation.

## Campaign Safety & Cost Discipline

1. **Plan first, submit only with explicit user approval**: Validate every NIM request locally with `bionemo-bionemo_plan` (`zero cost`) before invoking `bionemo-bionemo_submit`. Each `submit` call triggers user confirmation and consumes the user's NVIDIA API credits.
2. **Bounded batch size (`<= 4` per unconfirmed wave)**: Never fire large unconfirmed sweeps. Generate and refold at most **4 candidate backbones/sequences per approved wave** unless the user explicitly approves a larger campaign batch size.
3. **Subagent isolation**: If running inside a subagent (`state.dir`), materialized BioNeMo outputs live inside your subagent workspace path; do not attempt `bionemo_submit` directly inside a subagent — return `report({ status: "blocked", question })` with planned requests for parent approval.

## Staged Funnel Workflow

1. **Target Preparation (Sandbox Python + BioPython)**:
   - Inspect the user-provided target PDB/mmCIF (chain IDs, residue numbering, heteroatoms/waters, missing loops). Note: `rfdiffusion` NIM requires single-character PDB chain IDs.
   - Identify binding-site hotspot residues from literature or surface pocket geometry, strip unwanted waters/buffers, and write a clean cropped target PDB to `/workspace/`.
2. **Backbone Generation (`rfdiffusion` via `nvidia-bionemo`)**:
   - Inspect exact schema via `bionemo-bionemo_describe({ capability: "rfdiffusion" })`.
   - Use `connector_call` `file_inputs: { "payload.input_pdb": "/workspace/target_clean.pdb" }` with hotspot residues and contig length range. Validate with `bionemo-bionemo_plan`, then run approved `bionemo-bionemo_submit` + `bionemo-bionemo_poll`.
3. **Sequence Design (`proteinmpnn` via `nvidia-bionemo`)**:
   - Inspect designed backbones geometrically (clash checks, secondary structure, backbone continuity). For promising backbones (up to 4 per batch), run `bionemo-bionemo_plan` then approved `bionemo-bionemo_submit` for `proteinmpnn` passing the designed backbone PDB via `file_inputs` while keeping target chain residues fixed.
4. **Independent Complex Refolding (`boltz2` / `openfold3`)**:
   - Evaluate up to 4 top sequences in independent complex prediction (`boltz2` or `openfold3`) with both target and designed binder chains. Record `request_sha256` and exact model versions.
   - Never treat small-molecule ligand affinity fields as protein–protein binding metrics.
5. **Interface Scoring & Diversity Report (Sandbox Python)**:
   - Compute binder-target Cα/heavy-atom interface contacts, hotspot burial, sequence identity diversity across candidates, self-consistency RMSD between RFdiffusion backbone and Boltz-2/OpenFold3 refolded binder, and confidence scores (`pLDDT`, `iPTM`).
   - Deliver a candidate manifest CSV/JSON linking backbone -> sequence -> complex file paths -> metrics alongside top `.cif`/`.pdb` structures (loaded with `structure_load` if available).
