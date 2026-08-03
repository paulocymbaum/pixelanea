#!/usr/bin/env bash
# Run Playwright with Node 20+ (required by @playwright/test).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# Quote args individually so grep patterns with | survive (e.g. --grep 'PR-REG-001|RACE-002').
playwright_args=()
for arg in "$@"; do
  playwright_args+=("$(printf '%q' "$arg")")
done

if [[ ${#playwright_args[@]} -eq 0 ]]; then
  npx -y -p node@20 -c "cd '${ROOT_DIR}' && ./node_modules/.bin/playwright test"
else
  npx -y -p node@20 -c "cd '${ROOT_DIR}' && ./node_modules/.bin/playwright test ${playwright_args[*]}"
fi
