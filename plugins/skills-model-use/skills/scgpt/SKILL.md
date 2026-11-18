---
name: scgpt
description: 'Embed and annotate single-cell expression data with scGPT, a foundation model for single-cell biology. Use this skill when: (1) Producing cell embeddings from an AnnData for clustering/integration, (2) Zero-shot or fine-tuned cell-type annotation, (3) Gene-level representation for perturbation/GRN tasks. For probabilistic single-cell models (scVI etc.), use the scvi-tools library.'
metadata:
  tumbleweed:
    domains:
    - single-cell
    - transcriptomics
    tags:
    - scgpt
    - model-use
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use scgpt: Embed and annotate single-cell expression data with scGPT, a foundation model for single-cell biology.'
    requires:
      environment: sandbox
      gpu: true
      tools:
      - anndata
      - scanpy
      - scgpt
      - torch
      dataSources: []
      models: []
      scienceModels:
      - scgpt
      credentials: []
      longRunning: true
      image: bioinfo
      resourceClass: large
      network: []
    inputs:
    - h5ad
    - json
    outputs:
    - json
    - h5ad
    title: scGPT
license: Apache-2.0
---

# scGPT — Single-Cell Foundation Model

## Prerequisites

| Requirement | Minimum | Recommended |
| ----------- | ------- | ----------- |
| Python      | 3.10+   | 3.11        |
| CUDA        | 12.1+   | 12.4+       |
| GPU VRAM    | 16 GB   | 24 GB+      |
## How to run

### Loading the vocabulary and checkpoint

scGPT checkpoints are **raw directories** (`args.json`, `best_model.pt`,
`vocab.json`) — not Hugging Face hub repos. Point at the directory, not an HF
repo id.

```python
from scgpt.tokenizer.gene_tokenizer import GeneVocab
gv = GeneVocab.from_file("/path/to/scgpt-human/vocab.json")
print(len(gv))   # 60697 for the released human checkpoint
```

### Embedding an AnnData

```python
import anndata as ad
from scgpt.tasks import embed_data

adata = ad.read_h5ad("dataset.h5ad")        # var must contain a gene-name column
emb = embed_data(
    adata,
    model_dir="/path/to/scgpt-human",
    gene_col="feature_name",
    use_fast_transformer=False,             # see Gotchas
)
# emb is an AnnData with .obsm["X_scGPT"]
```

## Output format

`embed_data` returns an `AnnData` whose `.obsm["X_scGPT"]` is the per-cell
embedding (`n_cells × emb_dim`, 512 by default). Downstream: feed to
`scanpy.pp.neighbors` / `scanpy.tl.umap`.

## Remote compute

Needs ≥24 GB VRAM and the released human checkpoint (~200 MB:
`args.json`, `best_model.pt`, `vocab.json`). Read
`compute_details({provider, mode:'read'})` for an environment with `scgpt`
and a pre-cached checkpoint directory, then:

```bash
# Submit via configured Tumbleweed GPU runner (requires.gpu: true)
```

Then call the `wait_for_notification` brain-tool. When the
`compute_done` notification arrives, act on its payload:

```python
# Inspect or save generated output files directly in the workspace.
```

For the full record (`files`, `stdout_tail`, `notes`, …), re-enter the
kernel and bind the compute handle separately — `.close()` lives on the
handle, not on the job object:

```bash
# Submit via configured Tumbleweed GPU runner (requires.gpu: true)
```

the GPU runner configuration for the
orchestration details.

In `embed.py`, pass `model_dir=` the checkpoint path from the GPU runner config.
If `flash-attn` is unavailable in that environment, set
`use_fast_transformer=False`.

## Gotchas

- **`use_fast_transformer` default is `True`** but resolves to a FlashAttention
  path that may not import in every env. Pass `use_fast_transformer=False`
  unless you've confirmed `flash_attn` loads cleanly.
- The package historically depended on `torchtext.vocab.Vocab`; in
  environments without torchtext a pure-Python shim provides `Vocab` —
  functionally identical for `GeneVocab`, but if you hit
  `AttributeError: 'Vocab' object has no attribute …`, you're on a stale shim.
- Gene names must match the vocab; unmatched genes are dropped. Set
  `gene_col` to the column in `adata.var` that holds symbols.

## Troubleshooting

| Symptom                                           | Fix                                              |
| ------------------------------------------------- | ------------------------------------------------ |
| `flash_attn is not installed` warning at import   | Harmless; pass `use_fast_transformer=False`      |
| `'Vocab' object has no attribute 'vocab'`         | Env has an old torchtext shim — update the env   |
| Nearly all genes dropped                          | Wrong `gene_col`; check `adata.var.columns`      |
| "scgpt not in manifest" / env-detection misses scGPT | The baked env manifest lists the distribution as `scGPT` (and `flash_attn`), pip's canonical casing — normalize manifest keys before lookup: `name.lower().replace('-', '_')` |

---

**Next**: cluster/annotate the embedding with the scanpy library
(`sc.pp.neighbors` → `sc.tl.leiden` / `sc.tl.umap`), or compare to an
scvi-tools latent space on the same data.

## Local Checkpoint Structure & Reference Mapping Notes

- Expected pretrained checkpoint directory contains `args.json`, `vocab.json`, and `best_model.pt`.
- Standard preprocessing sets `normalize_total=1e4`, `log1p`, HVG selection, and `binning=n_bins` in `adata.layers["X_binned"]` with `adata.var["gene_name"]`.
- See `references/local-usage.md` and `references/workflow-notes.md` for embedding extraction (`scgpt.tasks.cell_emb.embed_data`) and integration fine-tuning details.
