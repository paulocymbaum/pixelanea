#!/usr/bin/env bash
# Deterministic performance regression gate (backend benchmarks + frontend perf tests).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

CMAKE="cmake"
CTEST="ctest"
if ! command -v cmake >/dev/null 2>&1; then
  CMAKE="${ROOT_DIR}/.venv-build/bin/cmake"
fi
if ! command -v ctest >/dev/null 2>&1; then
  CTEST="${ROOT_DIR}/.venv-build/bin/ctest"
fi

echo "=== Performance regression tests ==="

if [[ ! -x "${ROOT_DIR}/server/build/pixelanea_tests" ]]; then
  echo "→ Configuring and building server (Debug)…"
  "${CMAKE}" -S server -B server/build \
    -DCMAKE_BUILD_TYPE=Debug \
    -DCMAKE_CXX_COMPILER="${CXX:-g++}" \
    -DCMAKE_C_COMPILER="${CC:-gcc}" \
    -G "Unix Makefiles"
  "${CMAKE}" --build server/build
fi

echo "→ Backend benchmarks (ctest -R 'within performance budget')"
"${CTEST}" --test-dir server/build -R "within performance budget" --output-on-failure

echo "→ Frontend perf tests (vitest)"
pnpm --filter @pixelanea/web exec vitest run \
  src/tools/paintStrokePerf.test.ts \
  src/state/frameCachePerf.test.ts \
  src/components/animation/animationPlaybackPerf.test.ts

echo "=== Performance regression tests passed ==="
