#!/usr/bin/env bash
set -euo pipefail
echo "Checking antibody developability Python & HMMER environment..."
python3 -m pip install --quiet abnumber pyteomics biopython pandas numpy matplotlib seaborn reportlab pypdf requests anarci || true
command -v hmmscan >/dev/null 2>&1 || echo "[WARN] hmmscan (hmmer) not on PATH"
