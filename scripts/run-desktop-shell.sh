#!/usr/bin/env bash
# Run Pixelanea in the native Tauri shell (WebView window, no browser).
#
# Usage:
#   ./scripts/run-desktop-shell.sh              # dev: build assets if needed, cargo tauri dev
#   ./scripts/run-desktop-shell.sh --release    # build release shell binary and run it
#   ./scripts/run-desktop-shell.sh --no-build   # skip server/web build step
#   ./scripts/run-desktop-shell.sh --devtools   # dev only: open WebView inspector
#
# Environment:
#   PIXELANEA_PORT=8787
#   PIXELANEA_HOST=127.0.0.1
#   PIXELANEA_ROOT=/path/to/repo   override install dir (dev)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_DIR="${ROOT_DIR}/apps/desktop/src-tauri"
BINARY="${TAURI_DIR}/target/release/pixelanea-shell"

SKIP_BUILD=false
RELEASE=false
DEVTOOLS_ARGS=()

for arg in "$@"; do
  case "${arg}" in
    --no-build) SKIP_BUILD=true ;;
    --release) RELEASE=true ;;
    --devtools) DEVTOOLS_ARGS+=(--devtools) ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      echo "Run ./scripts/run-desktop-shell.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

export PIXELANEA_ROOT="${PIXELANEA_ROOT:-${ROOT_DIR}}"

if [[ "${SKIP_BUILD}" != true ]]; then
  if [[ ! -x "${ROOT_DIR}/server/build/pixelanea-server" || ! -f "${ROOT_DIR}/apps/web/dist/index.html" ]]; then
    "${ROOT_DIR}/scripts/build-desktop.sh"
  fi
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust: https://rustup.rs/" >&2
  exit 1
fi

if [[ "${RELEASE}" == true ]]; then
  echo "==> Building release desktop shell..."
  (cd "${TAURI_DIR}" && cargo tauri build)
  echo "==> Starting Pixelanea shell (release)..."
  exec "${BINARY}" "${DEVTOOLS_ARGS[@]}"
fi

echo "==> Starting Pixelanea shell (dev)..."
cd "${TAURI_DIR}"
if [[ ${#DEVTOOLS_ARGS[@]} -gt 0 ]]; then
  exec cargo tauri dev -- "${DEVTOOLS_ARGS[@]}"
fi
exec cargo tauri dev
