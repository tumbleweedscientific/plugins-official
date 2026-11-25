---
name: bionemo-nims
title: NVIDIA BioNeMo NIMs (Hosted)
description: Run hosted NVIDIA BioNeMo NIM endpoints (Boltz-2, OpenFold2/3, MSA Search, DiffDock, ProteinMPNN, RFdiffusion, GenMol, MolMIM, Evo 2) via the nvidia-bionemo MCP connector with your own NVIDIA API key and explicit per-task user approval.
license: CC-BY-4.0
metadata:
  tumbleweed:
    domains:
      - structural-biology
      - protein-design
      - docking
      - genomics
      - cheminformatics
    tags:
      - bionemo
      - nvidia-nim
      - structure-prediction
      - protein-design
      - docking
    maturity: experimental
    citations: []
    starterPrompts:
      - Use bionemo-nims to fold a protein-ligand complex with Boltz-2 via NVIDIA BioNeMo.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources:
        - nvidia-bionemo
      models: []
      scienceModels: []
      credentials:
        - nvidia-nim
      connectors:
        - nvidia-bionemo
      longRunning: true
    inputs:
      - fasta
      - pdb
      - mmcif
      - sdf
      - smiles
      - json
    outputs:
      - mmcif
      - pdb
      - sdf
      - json
      - report
---

# NVIDIA BioNeMo NIMs (Hosted)

Use this skill to invoke NVIDIA's hosted BioNeMo NIM inference endpoints through Tumbleweed's **`nvidia-bionemo`** MCP connector via `connector_call`. Nothing runs locally and no local GPU is required; every external submission uses your personal `nvidia-nim` API key (`X-Nvidia-Api-Key`), sends input payloads to NVIDIA's third-party cloud platform without Tumbleweed privacy guarantees, and may incur NVIDIA platform charges.

## Available Capabilities (10 Verified NIMs)

| Need | Capability ID | Typical Inputs |
| --- | --- | --- |
| Protein/complex structure and ligand affinity | `boltz2` | Polymer sequences, optional ligands/constraints |
| Multimer/template complex prediction | `openfold3` | Multi-chain query inputs, optional precomputed MSA |
| Monomer structure from alignment/templates | `openfold2` | Amino-acid sequence, MSA alignment, templates |
| Evolutionary multiple sequence alignment | `msa-search` | Amino-acid query sequence |
| Blind small-molecule protein docking | `diffdock` | Target PDB structure + ligand SMILES/SDF |
| Fixed-backbone sequence design | `proteinmpnn` | Input PDB backbone coordinates |
| De novo backbone / binder diffusion | `rfdiffusion` | Target PDB coordinates + contig specification |
| Fragment/linker small-molecule generation | `genmol` | SAFE / motif molecular seed + parameters |
| Property-guided molecule generation | `molmim` | Seed SMILES + optimization objective |
| DNA sequence generative continuation | `evo2` | Nucleotide prompt + sampling parameters |

## Mandatory Safe Workflow

Discover the exact tool names on connector `nvidia-bionemo` first (through Bifrost they are exposed as `bionemo-bionemo_describe`, `bionemo-bionemo_plan`, `bionemo-bionemo_submit`, and `bionemo-bionemo_poll`):

1. **Describe the contract (read-only)**: Call `bionemo-bionemo_describe` with `{ "capability": "<id>" }` to inspect the live strict JSON Schema, NVIDIA endpoint URL, terms URL, and field rules. Never guess field names or alphabets.
2. **Validate locally before asking to spend (read-only, zero cost)**: Call `bionemo-bionemo_plan` with `{ "capability": "<id>", "payload": ... }` (or pass workspace structure/alignment files via `connector_call` `file_inputs`, e.g., `payload.input_pdb`, `payload.polymers.0.structural_templates.0.structure`). Fix any validation errors until `valid: true` and review the returned `payload_bytes` and `request_sha256`.
3. **Submit with explicit user approval**: Call `bionemo-bionemo_submit` via `connector_call` with a unique `idempotency_key` alongside `capability` and `payload` (plus any workspace `file_inputs`).
   - Root conversations automatically present a user approval card showing the external NVIDIA service, egress payload summary, hash, and terms URL; proceed only if approved.
   - Inside a subagent (`state.dir` active), `bionemo_submit` refuses automatic prompting — immediately stop and call `report({ status: "blocked", question })` with the planned capability, input paths, and egress byte summary so the parent conversation can obtain approval.
   - If the user rejects a submission, do not retry with the same scope.
4. **Poll until completion (read-only)**: If `submit` returns `{ status: "pending", request_id }`, call `bionemo-bionemo_poll` (`wait_seconds: 15`, up to `20`) until `completed` or terminal failure. Surface NVCF errors honestly without leaking credentials.
5. **Inspect delivered artifacts**: `connector_call` automatically materializes `.cif`, `.pdb`, `.sdf`, and `.a3m` resources under `/workspace/connectors/nvidia-bionemo/` (or `${state.dir}/connectors/nvidia-bionemo/` inside a subagent). Load 3D coordinates with `structure_load` when visualization is available and report structural confidence metrics (`plddt`, `ptm`, `iptm`, DiffDock confidence) alongside the computational-prediction disclaimer.
