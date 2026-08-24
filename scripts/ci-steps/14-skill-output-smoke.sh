#!/usr/bin/env bash
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "14 — skill-output smoke (canonical test.md / matrix)"
./scripts/run-skill-output-smoke.sh
ci_step_end "14 — skill-output smoke (canonical test.md / matrix)"
