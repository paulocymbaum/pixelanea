#!/usr/bin/env bash
# Configure, compile, and run migration + file-dialog Catch2 tests on the host OS.
# Used by GitHub-hosted windows-latest / macos-15 / macos-15-intel jobs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/server/build-native"

CMAKE_BIN="${CMAKE:-cmake}"
if ! command -v "${CMAKE_BIN}" >/dev/null 2>&1; then
  echo "cmake not found on PATH" >&2
  exit 1
fi

GENERATOR_ARGS=()
if command -v ninja >/dev/null 2>&1; then
  GENERATOR_ARGS=(-G Ninja)
elif [[ "$(uname -s)" == "Darwin" ]] || [[ "$(uname -s)" == Linux ]]; then
  GENERATOR_ARGS=(-G "Unix Makefiles")
fi

echo "==> cmake configure (${BUILD_DIR})"
"${CMAKE_BIN}" "${GENERATOR_ARGS[@]}" \
  -S "${ROOT_DIR}/server" \
  -B "${BUILD_DIR}" \
  -DCMAKE_BUILD_TYPE=Debug \
  -DBUILD_TESTING=ON

echo "==> cmake build pixelanea_tests + pixelanea-server"
if [[ -f "${BUILD_DIR}/build.ninja" || -f "${BUILD_DIR}/Makefile" ]]; then
  "${CMAKE_BIN}" --build "${BUILD_DIR}" --target pixelanea_tests pixelanea-server
else
  "${CMAKE_BIN}" --build "${BUILD_DIR}" --config Debug --target pixelanea_tests pixelanea-server
fi

find_tests_bin() {
  local candidate
  for candidate in \
    "${BUILD_DIR}/pixelanea_tests" \
    "${BUILD_DIR}/pixelanea_tests.exe" \
    "${BUILD_DIR}/Debug/pixelanea_tests.exe" \
    "${BUILD_DIR}/RelWithDebInfo/pixelanea_tests.exe"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

TESTS_BIN="$(find_tests_bin)" || {
  echo "ERROR: pixelanea_tests binary not found under ${BUILD_DIR}" >&2
  exit 1
}

echo "==> ${TESTS_BIN} [migration],[file_dialog]"
"${TESTS_BIN}" "[migration],[file_dialog]"
