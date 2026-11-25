# Biopython Recipes

## 1. Extract CDS features from GenBank

```python
from Bio import SeqIO

for rec in SeqIO.parse("/workspace/genome.gb", "genbank"):
    for feat in rec.features:
        if feat.type == "CDS":
            aa = feat.extract(rec.seq).translate(table=11, to_stop=True)
            gene = feat.qualifiers.get("gene", ["unknown"])[0]
            print(gene, len(aa))
```

## 2. Global/Local Pairwise Alignment (`Bio.Align.PairwiseAligner`)

```python
from Bio.Align import PairwiseAligner

aligner = PairwiseAligner(mode="global", match_score=2, mismatch_score=-1, open_gap_score=-2, extend_gap_score=-0.5)
aln = aligner.align("MVLSPADKTNVK", "MVLSAADKTNVK")[0]
print(aln.score)
```

## 3. Parse PDB / mmCIF chains safely

```python
from Bio.PDB import MMCIFParser, PPBuilder

struct = MMCIFParser(QUIET=True).get_structure("model", "/workspace/model.cif")
ppb = PPBuilder()
for chain in struct[0]:
    seq = "".join(str(pp.get_sequence()) for pp in ppb.build_peptides(chain))
    if seq:
        print(chain.id, len(seq))
```
