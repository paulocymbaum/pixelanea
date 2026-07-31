#!/usr/bin/env bash
# Build Pixelanea for desktop use: release backend + static frontend bundle.
#
# Usage:
#   ./scripts/build-desktop.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/server/build"
WEB_DIST="${ROOT_DIR}/apps/web/dist"

CMAKE_BIN="cmake"
if ! command -v cmake >/dev/null 2>&1; then
  if [[ -x "${ROOT_DIR}/.venv-build/bin/cmake" ]]; then
    CMAKE_BIN="${ROOT_DIR}/.venv-build/bin/cmake"
  else
    echo "cmake not found. Install cmake or create ${ROOT_DIR}/.venv-build." >&2
    exit 1
  fi
fi

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack enable 2>/dev/null || true
    corepack prepare pnpm@9.15.4 --activate 2>/dev/null || true
  fi
  command -v pnpm >/dev/null 2>&1
}

if ! ensure_pnpm; then
  echo "pnpm not found. Install with: corepack enable && corepack prepare pnpm@9.15.4 --activate" >&2
  exit 1
fi

"${ROOT_DIR}/scripts/deps-cache.sh" install

echo "==> Building desktop assets (Release)..."
export CMAKE_BUILD_TYPE=Release
"${ROOT_DIR}/scripts/assets-cache.sh" ensure-all --build-type Release

if [[ ! -f "${WEB_DIST}/index.html" ]]; then
  echo "ERROR: frontend build missing ${WEB_DIST}/index.html" >&2
  exit 1
fi

echo ""
echo "Desktop build ready:"
echo "  Server:   ${BUILD_DIR}/pixelanea-server"
echo "  Frontend: ${WEB_DIST}"
echo ""
echo "Run: ./scripts/run-desktop.sh"
