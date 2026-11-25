# Datamol Recipes

## 1. Parallel batch descriptors & Morgan fingerprints

```python
import datamol as dm

smiles_list = ["CCO", "CC(=O)Oc1ccccc1C(=O)O", "c1ccccc1"]
mols = [dm.standardize_mol(dm.to_mol(s)) for s in smiles_list]
desc_df = dm.descriptors.batch_compute_many_descriptors(mols, n_jobs=-1)
fps = [dm.to_fp(m, fp_type="ecfp", nBits=2048, radius=2) for m in mols if m is not None]
```

## 2. Generate 3D conformers safely

```python
import datamol as dm

mol = dm.to_mol("CC(=O)Oc1ccccc1C(=O)O")
mol_3d = dm.conformers.generate(mol, n_confs=10, minimize_energy=True, n_jobs=-1)
dm.to_sdf([mol_3d], "/workspace/conformers.sdf")
```
