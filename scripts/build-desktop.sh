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

echo "==> Building backend (Release)..."
CMAKE_ARGS=(
  -S "${ROOT_DIR}/server"
  -B "${BUILD_DIR}"
  -DCMAKE_BUILD_TYPE=Release
  -DCMAKE_CXX_COMPILER="${CXX:-g++}"
  -DCMAKE_C_COMPILER="${CC:-gcc}"
)

if [[ ! -f "${BUILD_DIR}/CMakeCache.txt" ]]; then
  if command -v ninja >/dev/null 2>&1; then
    CMAKE_ARGS+=("-G" "Ninja")
  else
    CMAKE_ARGS+=("-G" "Unix Makefiles")
  fi
fi

if [[ -n "${VCPKG_ROOT:-}" && -f "${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" ]]; then
  CMAKE_ARGS+=("-DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
fi

"${CMAKE_BIN}" "${CMAKE_ARGS[@]}"
"${CMAKE_BIN}" --build "${BUILD_DIR}"

if ! ensure_pnpm; then
  echo "pnpm not found. Install with: corepack enable && corepack prepare pnpm@9.15.4 --activate" >&2
  exit 1
fi

if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
  echo "==> Installing frontend dependencies..."
  (cd "${ROOT_DIR}" && pnpm install)
fi

echo "==> Building frontend..."
(cd "${ROOT_DIR}" && pnpm --filter @pixelanea/api-client build && pnpm --filter @pixelanea/web exec vite build)

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
