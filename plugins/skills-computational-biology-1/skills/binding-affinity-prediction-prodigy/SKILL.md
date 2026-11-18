---
name: binding-affinity-prediction-prodigy
description: 'Protein complex binding affinity prediction. Use this skill when: (1) Predict the binding affinity score, (2) Using protein complex structure.'
metadata:
  tumbleweed:
    domains:
    - structural-biology
    tags:
    - binding-affinity-prediction-prodigy
    - computational-biology
    - binding affinity
    - protein complex
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use binding-affinity-prediction-prodigy: Protein complex binding affinity prediction.'
    requires:
      environment: sandbox
      gpu: false
      tools:
      - biopython
      - prodigy-prot
      dataSources: []
      models: []
      scienceModels:
      - prodigy
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network: []
    inputs:
    - pdb
    outputs:
    - pdb
    title: Binding Affinity Prediction PRODIGY
license: Apache-2.0
---

# Prodigy Binding Affinity Prediction for Protein Complex

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Python | 3.10+ | 3.10 |
| RAM | 32GB | 64GB |
## How to run

### Local installation
```bash
pip install prodigy-prot
```

### Predict binding affinity of a protein complex structure
```python
import os 

def pred_binding_affinity(complex_pdb_file, distance_cutoff=5.5):
    """
    :param complex_pdb_file: path to the protein complex structure file
    :param distance_cutoff: distance cutoff to calculate ICs
    :return binding affinity score for protein complex
    """

    command = [
        'prodigy', pdb_file,
        '--distance-cutoff', distance_cutoff
    ]

    try:
        output = subprocess.run(command, capture_output=True, text=True).stdout.split("##########################################")[1]
        score = output.split("[++] Predicted binding affinity (kcal.mol-1):")[1].split("\n")[0] 
    except:
        output = "No contacts found for selection"
        score = "0.0"

    return float(score.strip())

# Predict binding affinity score for protein complex (PDB file)
binding_affinity_score = pred_binding_affinity(complex_pdb_file)
```

## Decision tree

```
Should I use Prodigy?
│
└─ What type of complex are evaluated?
   ├─ Protein complex → binding-affinity-prediction-prodigy ✓
   └─ Protein-ligand complex → structure-prediction-boltz-2
```
