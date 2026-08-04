#!/usr/bin/env bash
# Install Playwright Chromium with Node 20+ (required by @playwright/test).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

with_deps=false
for arg in "$@"; do
  if [[ "${arg}" == "--with-deps" ]]; then
    with_deps=true
  fi
done

install_args=(install chromium)
if ${with_deps}; then
  install_args+=(--with-deps)
fi

npx -y -p node@20 -c "cd '${ROOT_DIR}' && ./node_modules/.bin/playwright ${install_args[*]}"
