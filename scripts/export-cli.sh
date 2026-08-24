#!/usr/bin/env bash
# Experimental headless PNG export (pixelanea-cli). Prefer File → Export in the app for GIF/spritesheet.
# Run pixelanea-cli export (builds CLI binary if missing).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

CLI_BIN="${ROOT_DIR}/server/build/pixelanea-cli"

if [[ ! -x "${CLI_BIN}" ]]; then
  echo "==> Building pixelanea-cli"
  cmake -S server -B server/build -DCMAKE_BUILD_TYPE=Debug >/dev/null
  cmake --build server/build --target pixelanea-cli -j"$(nproc)"
fi

# pnpm passes `--` before script args when invoked as `pnpm export:cli -- export …`
if [[ "${1:-}" == "--" ]]; then
  shift
fi

exec "${CLI_BIN}" "$@"
