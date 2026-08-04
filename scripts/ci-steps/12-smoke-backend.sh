#!/usr/bin/env bash
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "12 — backend smoke tests"
export CI_SKIP_REDUNDANT=1
./scripts/test-backend.sh
ci_step_end "12 — backend smoke tests"
