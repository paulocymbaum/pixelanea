#!/usr/bin/env bash
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "11 — Playwright E2E (excl. LinkedIn)"
export CI=true
pnpm test:e2e --grep-invert 'LinkedIn|@perf'
ci_step_end "11 — Playwright E2E (excl. LinkedIn)"
