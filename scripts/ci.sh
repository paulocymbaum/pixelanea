#!/usr/bin/env bash
# Full CI gate — mirrors .github/workflows/build.yml (build job, excluding bump-version).
# Run from repo root before push/PR when you want the same checks as GitHub Actions.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

CTEST="ctest"
if ! command -v ctest >/dev/null 2>&1; then
  CTEST="${ROOT_DIR}/.venv-build/bin/ctest"
fi

echo "=== Pixelanea CI (build job) ==="

echo "→ Install dependencies"
./scripts/deps-cache.sh install

echo "→ Ensure API client assets"
./scripts/assets-cache.sh ensure-api

echo "→ Lint"
pnpm lint

echo "→ Frontend typecheck"
pnpm typecheck

echo "→ QA matrix harness"
pnpm test:qa

echo "→ Frontend unit tests"
pnpm test:unit

echo "→ Build frontend"
./scripts/assets-cache.sh ensure-web

echo "→ Build backend"
export CMAKE_BUILD_TYPE=Debug
./scripts/assets-cache.sh ensure-server

echo "→ Backend unit tests"
"${CTEST}" --test-dir server/build --output-on-failure

if [[ ! -x "${ROOT_DIR}/node_modules/.bin/playwright" ]]; then
  echo "→ Playwright CLI missing — reinstalling node_modules"
  pnpm install
fi

echo "→ Ensure Playwright Chromium browser"
./scripts/e2e-install.sh

echo "→ Playwright E2E (excl. LinkedIn media capture)"
export CI=true
pnpm test:e2e --grep-invert LinkedIn

echo "→ Backend smoke tests"
./scripts/test-backend.sh

echo "→ Frontend smoke tests"
./scripts/test-frontend.sh

echo "=== Pixelanea CI passed ==="
