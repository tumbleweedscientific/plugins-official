---
name: openfold3
description: Structure prediction using OpenFold3, an open-weights PyTorch reproduction of AlphaFold3 from the AlQuraishi Lab. Use this skill when predicting protein/nucleic-acid/ligand complex structures with an Apache-2.0-licensed AF3 reimplementation.
metadata:
  tumbleweed:
    title: OpenFold3
    domains:
    - structural-biology
    - docking
    tags:
    - openfold3
    - model-use
    maturity: stable
    citations: []
    starterPrompts:
    - 'Predict the 3D structure of this protein-ligand complex with OpenFold3:'
    requires:
      environment: web
      gpu: true
      tools: []
      dataSources: []
      models: []
      scienceModels:
      - openfold3
      credentials: []
      longRunning: true
      network: []
    inputs:
    - json
    - fasta
    - smiles
    outputs:
    - mmcif
    - json
license: Apache-2.0
---

# OpenFold3 Structure Prediction

On Tumbleweed Scientific, OpenFold3 runs directly on serverless NVIDIA A100 GPUs (40 GB / 80 GB) with pre-staged Apache-2.0 weights (`openbind-2025-06-30-174k`) and automatic MSA caching via the built-in **`run_model`** tool — in **both Web and Cloud Sandbox** conversations, with no local installation or Hugging Face token required.

## Running OpenFold3 on Tumbleweed (`run_model`)

Always prefer `run_model` over local `pip install` or CLI invocations:

```json
{
  "model": "openfold3",
  "outputDir": "/workspace/predictions/kras_g12c",
  "chains": [
    {
      "id": "A",
      "type": "protein",
      "sequence": "MTEYKLVVVGACGVGKSALTIQLIQNHFVDEYDPTIEDSYRKQVVIDGETCLLDILDTAGQEEYSAMRDQYMRTGEGFLCVFAINNTKSFEDIHHYREQIKRVKDSEDVPMVLVGNKCDLPSRTVDTKQAQDLARSYGIPFIETSAKTRQGVDDAFYTLVRIRKHKEKMSKDGKKKKKKSKTKCVIM"
    },
    {
      "id": "L",
      "type": "ligand",
      "smiles": "C=CC(=O)N1CCN(CC1)c2nc(=O)n(c3nc(c(cc23)F)c4c(cccc4F)O)C(C)C"
    }
  ],
  "seeds": 1,
  "diffusionSamples": 5
}
```

### Key rules for `run_model(model="openfold3")`

- **Inline `chains` only** (up to 3,000 total residues across all chains and `copies`): pass `inputs: []` (or omit `inputs`), because `openfold3` takes all chains inline rather than reading input FASTA files.
- **Supported chain types**:
  - `"protein"` / `"rna"` / `"dna"` — provide `sequence` (one-letter uppercase residues) and optional `copies` (integer ≥ 1, e.g. `2` for a homodimer).
  - `"ligand"` — provide **either** `smiles` **or** `ccd` (PDB Chemical Component Dictionary 3-letter code, e.g. `"ATP"`, `"HEM"`), plus optional `copies`.
- **Sampling parameters**:
  - `seeds` (`1`–`5`, default `1`): independent model seeds.
  - `diffusionSamples` (`1`–`5`, default `5`): diffusion structures generated per seed.
  - `fullConfidence` (`boolean`, default `false`): set `true` only when full PAE/PDE matrices are explicitly needed.
- **Background execution**: OpenFold3 runs promote immediately to a background job (`promoteAfterSeconds: 0`) so the conversation stays responsive. Do **not** poll in a loop — once submitted, summarize what was launched and wait for the completion report message, which automatically unpacks results into `outputDir` (`prediction_1.cif`, `samples/`, `confidence.json`).
- **3D inspection**: Once settled, inspect `confidence.json` (`avg_plddt`, `ptm`, `iptm`, `has_clash`, `sample_ranking_score`) and load the top-ranked `.cif` into the 3D Biomolecular Structure Viewer when available.

## Interpreting Confidence Metrics

```json
{
  "avg_plddt": 84.2,
  "ptm": 0.81,
  "iptm": 0.76,
  "gpde": 0.58,
  "has_clash": 0.0,
  "sample_ranking_score": 0.77,
  "chain_ptm": { "A": 0.83 },
  "chain_pair_iptm": { "A,L": 0.76 }
}
```

- **`avg_plddt` > 80** (with MSA) / **> 70** (single-sequence): high local atomic confidence.
- **`ptm` > 0.6**: confident global fold; for multi-chain or protein–ligand complexes, look for **`iptm` > 0.6** (strong interface confidence above `0.75`).
- **`has_clash: 0.0`**: confirms absence of severe steric clashes; inspect interface contacts on any sample where `has_clash > 0`.
- **`sample_ranking_score`**: combined AF3-style ranking metric (`0.8 * iptm + 0.2 * ptm` penalized by disorder/clash) used to pick `prediction_1.cif`.

---

## Standalone CLI Reference (External GPU Environments Only)

If exporting a reproducible workflow for a user's own external CUDA machine (Python 3.10+, CUDA 12.1+, ≥ 24 GB VRAM):

```bash
pip install 'openfold3[cuequivariance]==0.5.1'
run_openfold predict \
  --query_json=queries.json \
  --output-dir out/
```

Standalone `queries.json` schema (`InferenceQuerySet`):

```json
{
  "queries": {
    "my_complex": {
      "chains": [
        {"molecule_type": "protein", "chain_ids": ["A"], "sequence": "MQIFVK..."},
        {"molecule_type": "ligand",  "chain_ids": ["L"], "smiles": "CC(=O)Oc1ccccc1C(=O)O"}
      ],
      "use_msas": true
    }
  },
  "seeds": [42]
}
```
