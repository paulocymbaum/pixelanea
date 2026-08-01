#!/usr/bin/env bash
# Run Playwright with Node 20+ (required by @playwright/test).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

npx -y -p node@20 -c "cd '${ROOT_DIR}' && ./node_modules/.bin/playwright test $*"
