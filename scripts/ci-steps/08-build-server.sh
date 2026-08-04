#!/usr/bin/env bash
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "08 — build backend"
export CMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:-Debug}"
./scripts/assets-cache.sh ensure-server
ci_step_end "08 — build backend"
