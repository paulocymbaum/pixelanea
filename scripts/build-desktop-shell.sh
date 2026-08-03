#!/usr/bin/env bash
# Build the Tauri desktop shell (release binary).
#
# Usage:
#   ./scripts/build-desktop-shell.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_DIR="${ROOT_DIR}/apps/desktop/src-tauri"

"${ROOT_DIR}/scripts/build-desktop.sh"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust: https://rustup.rs/" >&2
  exit 1
fi

echo "==> Building pixelanea-shell (release)..."
(cd "${TAURI_DIR}" && cargo tauri build)

echo ""
echo "Desktop shell ready:"
echo "  ${TAURI_DIR}/target/release/pixelanea-shell"
echo ""
echo "Run: ./scripts/run-desktop-shell.sh --release"
