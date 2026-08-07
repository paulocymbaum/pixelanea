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
mkdir -p "${TAURI_DIR}/bundle-resources/pixelanea"
# shellcheck source=stage-desktop-assets.sh
source "${ROOT_DIR}/scripts/stage-desktop-assets.sh"
stage_desktop_core_assets "${TAURI_DIR}/bundle-resources/pixelanea"
(cd "${TAURI_DIR}" && cargo tauri build)

echo ""
echo "Desktop shell ready:"
echo "  ${TAURI_DIR}/target/release/pixelanea-shell"
echo ""
echo "Run: ./scripts/run-desktop-shell.sh --release"
