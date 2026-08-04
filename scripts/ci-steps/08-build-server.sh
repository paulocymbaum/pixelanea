#!/usr/bin/env bash
# Wrapper: configure + compile (use 08a/08b in CI for clearer logs).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bash "${ROOT_DIR}/scripts/ci-steps/08a-server-configure.sh"
bash "${ROOT_DIR}/scripts/ci-steps/08b-server-compile.sh"
