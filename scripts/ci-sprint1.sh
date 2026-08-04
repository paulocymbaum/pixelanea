#!/usr/bin/env bash
# Sprint 1 CI gate — typecheck, QA matrix harnesses, web unit tests, optional E2E, backend tests.
# Run from repo root before sprint PRs merge.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "=== Sprint 1 CI gate ==="

echo "→ Frontend typecheck"
pnpm --filter @pixelanea/web exec tsc --noEmit

echo "→ QA matrix harness (src/qa/)"
pnpm --filter @pixelanea/web exec vitest run src/qa/

echo "→ Frontend unit tests"
pnpm --filter @pixelanea/web test

if [[ -x "${ROOT_DIR}/server/build/pixelanea_tests" ]]; then
  echo "→ Backend unit tests (pixelanea_tests)"
  "${ROOT_DIR}/server/build/pixelanea_tests"
else
  echo "→ Skipping pixelanea_tests (binary not found — build server first)"
fi

if [[ -x "${ROOT_DIR}/server/build/pixelanea-server" ]] && [[ -x "${ROOT_DIR}/node_modules/.bin/playwright" ]]; then
  echo "→ Ensure Playwright Chromium browser"
  ./scripts/e2e-install.sh
  echo "→ Playwright E2E (excl. LinkedIn media capture)"
  export CI=true
  pnpm test:e2e --grep-invert LinkedIn
else
  echo "→ Skipping Playwright E2E (build server + pnpm install first)"
fi

echo "=== Sprint 1 CI gate passed ==="
