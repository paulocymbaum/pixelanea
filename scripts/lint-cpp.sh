#!/usr/bin/env bash
# C++ lint — architecture boundary checks (no compile required).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

python3 scripts/lint-cpp-boundaries.py "$@"
