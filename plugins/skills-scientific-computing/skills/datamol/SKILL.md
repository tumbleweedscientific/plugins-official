---
name: datamol
title: Datamol Pythonic Cheminformatics & Standardization
description: High-level Pythonic wrapper over RDKit (`datamol`, `dm.standardize_mol`, `dm.conformers`, `dm.descriptors`, `dm.to_fp`, `dm.read_sdf`) for molecular salt stripping, tautomer canonicalization, InChIKey deduplication, batch descriptor calculation, and parallel 3D conformer generation in `/workspace/`.
license: MIT
metadata:
  tumbleweed:
    domains:
      - cheminformatics
      - medicinal-chemistry
      - computational-chemistry
    tags:
      - datamol
      - rdkit
      - standardization
      - conformers
      - smiles
    maturity: stable
    citations: []
    starterPrompts:
      - Standardize salts, stereochemistry, and canonical InChIKeys in /workspace/compounds.csv with datamol and deduplicate entries.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - datamol
        - rdkit
        - python
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      network: []
      longRunning: false
    inputs:
      - csv
      - smiles
      - sdf
    outputs:
      - csv
      - sdf
      - json
---

# Datamol Pythonic Cheminformatics

Use `datamol` (`import datamol as dm`) when processing batches of SMILES or SDF compounds requiring clean standardization, fragment uncharging/desalting, parallel descriptor tables, or 3D conformer sampling.

## Non-negotiables

1. **Preserve stereochemistry intentions deliberately**: inspect whether input mixtures or racemates carry meaningful chiral centers before calling `dm.remove_stereochemistry` or tautomer canonicalization.
2. **Deduplicate on standardized `InChIKey` / `unique_id`**: never rely on uncanonicalized input SMILES strings.
3. **Log invalid rows instead of crashing**: guard `dm.to_mol(smi, ordered=True)` / `dm.standardize_mol(...)` for `None` returns and export a separate rejected-SMILES list.

## Bundled helper

Run [scripts/standardize_molecules.py](scripts/standardize_molecules.py) to standardize a SMILES CSV/TSV file and write canonical SMILES, `inchikey`, and RDKit descriptors:

```bash
python scripts/standardize_molecules.py /workspace/compounds.csv --smiles-col smiles --out /workspace/standardized.csv
```

See [references/datamol-recipes.md](references/datamol-recipes.md) for parallelized batch fingerprints, Butina clustering, and `dm.conformers.generate` snippets.
