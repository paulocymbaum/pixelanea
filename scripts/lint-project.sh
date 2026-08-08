#!/usr/bin/env bash
# Project lint — dependency wiring, import safety, packaging manifests.
#
# Usage:
#   ./scripts/lint-project.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

python3 scripts/lint-deps.py
python3 scripts/lint-imports.py
python3 scripts/lint-packaging.py

echo "lint-project: OK"
