#!/usr/bin/env bash
# Playwright E2E gate: @smoke and @sync/@race specs (nightly CI + local opt-in).
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "11a — Playwright E2E (@smoke + @race)"
export CI=true
pnpm test:e2e:smoke-race
ci_step_end "11a — Playwright E2E (@smoke + @race)"
