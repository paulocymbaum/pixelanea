#!/usr/bin/env bash
# Run canonical skill-output smoke gates (test.md + matrix Status).
# Manifest: .cursor/ci-smoke-manifest.txt
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

python3 .cursor/tools/run_skill_output_smoke.py
