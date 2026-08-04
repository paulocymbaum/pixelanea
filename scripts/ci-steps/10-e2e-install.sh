#!/usr/bin/env bash
set -euo pipefail
CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=ci-lib.sh
source "${CI_ROOT_DIR}/scripts/ci-lib.sh"
cd "${CI_ROOT_DIR}"

ci_step_begin "10 — install Playwright Chromium"
if [[ ! -x "${CI_ROOT_DIR}/node_modules/.bin/playwright" ]]; then
  echo "→ Playwright CLI missing — reinstalling node_modules"
  pnpm install
fi
if [[ "${CI:-}" == "true" ]]; then
  ./scripts/e2e-install.sh --with-deps
else
  ./scripts/e2e-install.sh
fi
ci_step_end "10 — install Playwright Chromium"
