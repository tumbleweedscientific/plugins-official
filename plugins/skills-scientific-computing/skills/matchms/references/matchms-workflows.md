# MS/MS Spectral Processing Workflows

## 1. Standard `matchms` MGF cleaning and ModifiedCosine matching

```python
from matchms.importing import load_from_mgf
from matchms.filtering import default_filters, normalize_intensities, require_minimum_number_of_peaks, select_by_mz
from matchms.similarity import ModifiedCosine
from matchms import calculate_scores

def clean_spectrum(s):
    s = default_filters(s)
    s = normalize_intensities(s)
    s = select_by_mz(s, mz_from=50.0, mz_to=1500.0)
    return require_minimum_number_of_peaks(s, n_required=6)

queries = [s for s in (clean_spectrum(x) for x in load_from_mgf("/workspace/queries.mgf")) if s is not None]
refs = [s for s in (clean_spectrum(x) for x in load_from_mgf("/workspace/library.mgf")) if s is not None]

scores = calculate_scores(references=refs, queries=queries, similarity_function=ModifiedCosine(tolerance=0.01))
best = scores.scores_by_query(queries[0], sort=True)[:10]
```

## 2. Pure NumPy/SciPy binned cosine fallback (zero extra dependencies)

```python
import numpy as np

def binned_cosine(mz_a, int_a, mz_b, int_b, bin_width=0.02, max_mz=2000.0):
    n_bins = int(max_mz / bin_width) + 1
    va = np.zeros(n_bins, dtype=np.float64)
    vb = np.zeros(n_bins, dtype=np.float64)
    np.add.at(va, np.clip((np.asarray(mz_a) / bin_width).astype(int), 0, n_bins - 1), np.sqrt(int_a))
    np.add.at(vb, np.clip((np.asarray(mz_b) / bin_width).astype(int), 0, n_bins - 1), np.sqrt(int_b))
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0
```
