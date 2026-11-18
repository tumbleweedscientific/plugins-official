#!/usr/bin/env bash
set -euo pipefail
echo "[setup] Installing cell-perturbation Python dependencies via pip..."
python3 -m pip install --quiet scanpy anndata cell-gears pertpy scvi-tools torch torchvision requests scipy numpy pandas matplotlib seaborn
