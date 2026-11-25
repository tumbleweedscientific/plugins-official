---
name: boltz-cloud
title: Boltz Cloud Compute
description: Run hosted Boltz Bio cloud workflows (Boltz-2.1 structure & binding prediction, ADME prediction, small-molecule library screening & generative design, protein binder screening & design) via the boltz-cloud MCP connector with your own BOLTZ_API_KEY and explicit cost/submission approval.
license: MIT
metadata:
  tumbleweed:
    domains:
      - structural-biology
      - protein-design
      - docking
      - cheminformatics
      - admet
    tags:
      - boltz
      - boltz-cloud
      - structure-prediction
      - protein-design
      - ligand-design
      - adme
    maturity: experimental
    citations: []
    starterPrompts:
      - Use boltz-cloud to estimate cost and predict a protein-ligand complex with Boltz-2.1 on Boltz Cloud.
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources:
        - boltz-cloud
      models: []
      scienceModels: []
      credentials:
        - boltz
      connectors:
        - boltz-cloud
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
      - sdf
      - json
      - report
---

# Boltz Cloud Compute

Use this skill to run Boltz Bio's hosted compute workflows through Tumbleweed's **`boltz-cloud`** MCP connector via `connector_call`. Nothing runs on a local or Tumbleweed GPU; all requests authenticate with your personal `boltz` API key (`X-Boltz-Api-Key`), send molecular payloads to `https://api.boltz.bio` without Tumbleweed privacy guarantees, and are billed directly to your Boltz Bio account.

## Available Capabilities (6 Cloud Workflows)

| Capability ID | Workflow | Primary Inputs | Billing Unit |
| --- | --- | --- | --- |
| `structure-and-binding` | Boltz-2.1 complex folding & affinity | `entities`, optional `binding`, `num_samples` | `num_samples` |
| `adme` | Tier-1 ADME scoring (`adme-v1`) | `molecules` (1–128 `{ smiles, id? }`) | molecules |
| `small-molecule-screen` | Small-molecule library virtual screen | `molecules`, `target`, optional `molecule_filters` | screened molecules |
| `small-molecule-design` | Generative small-molecule binder design | `num_molecules`, `target`, optional `chemical_space` | `num_molecules` |
| `protein-screen` | Protein binder library screen | `proteins`, `target` | screened proteins |
| `protein-design` | De novo protein binder design | `num_proteins` (**minimum 10**), `target` / `binder_specification` | `num_proteins` |

## Payload Conventions (Avoid Common 400 Errors)

1. **`entities` entries**: Always use plural `chain_ids` (array) and `value` (never `sequence` or singular `chain_id`):
   ```json
   {
     "entities": [
       { "type": "protein", "chain_ids": ["A"], "value": "MKTAYIAKQRQISFVKSHFSRQ" },
       { "type": "ligand_smiles", "chain_ids": ["B"], "value": "CCO" }
     ]
   }
   ```
   Valid `type` values: `protein`, `rna`, `dna`, `ligand_smiles`, `ligand_ccd`, `glycan`.
2. **`binding` block (optional)**: Use a flat object with explicit `type` (`"ligand_protein_binding"` with `binder_chain_id: "B"`, or `"protein_protein_binding"` with `binder_chain_ids: ["B"]`).
3. **Workspace structures via `file_inputs`**: When supplying structural templates or custom alignments as `{ "type": "base64", "data": "" }`, pass `/workspace/...` paths through `connector_call`'s `file_inputs` — `boltz-mcp` automatically encodes raw `.cif`/`.pdb`/`.a3m` UTF-8 text into base64.
4. **Metrics keys**: Boltz emits lowercase metric keys (`ptm`, `iptm`, `ligand_iptm`, `protein_iptm`, `complex_plddt`, `complex_iplddt`, `complex_pde`, `complex_ipde`, `binding_confidence`, `optimization_score`).

## Mandatory Safe Workflow

Discover the exact tool names on connector `boltz-cloud` first (through Bifrost they are exposed as `boltz-boltz_describe`, `boltz-boltz_estimate`, `boltz-boltz_submit`, `boltz-boltz_status`, `boltz-boltz_results`, and `boltz-boltz_list`):

1. **Inspect contract (read-only, zero cost)**: Call `boltz-boltz_describe` with `{ "capability": "<id>" }` to review required fields, notes, and example payloads. Optionally call `boltz-boltz_list` with `{}` to verify API key scope.
2. **Estimate cost before submitting (read-only, zero charge)**: Call `boltz-boltz_estimate` with `{ "capability": "<id>", "payload": ... }` (plus any workspace `file_inputs`). Report the returned `estimated_cost_usd` and billing breakdown clearly to the user.
3. **Submit with explicit user approval**: Call `boltz-boltz_submit` with `{ "capability": "<id>", "payload": ..., "idempotency_key": "<unique-slug>" }`.
   - Root conversations automatically present a user approval card showing the external Boltz Bio service, payload size/hash, and privacy terms; proceed only if approved.
   - Inside a subagent (`state.dir` active), `boltz_submit` blocks automatic prompting — call `report({ status: "blocked", question })` with the estimated USD cost, capability, and inputs so the parent conversation can request approval.
   - If the user declines, do not resubmit with the same scope.
4. **Poll status (read-only)**: Call `boltz-boltz_status` with `{ "capability": "<id>", "job_id": "...", "wait_seconds": 15 }` until `status` becomes `succeeded`, `failed`, or `stopped`.
5. **Retrieve metrics & 3D structures (read-only)**: Call `boltz-boltz_results` with `{ "capability": "<id>", "job_id": "..." }`. `connector_call` automatically materializes downloaded `.cif` / `.sdf` artifacts under `/workspace/connectors/boltz-cloud/` (or `${state.dir}/connectors/boltz-cloud/`). Use `structure_load` when 3D visualization is available and report all confidence/affinity scores with a computational-prediction disclaimer.
