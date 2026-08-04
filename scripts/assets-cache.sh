#!/usr/bin/env bash
# Hash-keyed build asset cache (brand/public, API client, web dist, server binaries).
#
# Usage:
#   ./scripts/assets-cache.sh hash [--build-type Debug|Release]
#   ./scripts/assets-cache.sh status [--build-type Debug|Release]
#   ./scripts/assets-cache.sh sync-brand
#   ./scripts/assets-cache.sh ensure-python-deps
#   ./scripts/assets-cache.sh ensure-api
#   ./scripts/assets-cache.sh ensure-web [--build-type Debug|Release]
#   ./scripts/assets-cache.sh configure-server [--build-type Debug|Release]
#   ./scripts/assets-cache.sh compile-server [--build-type Debug|Release]
#   ./scripts/assets-cache.sh ensure-server [--build-type Debug|Release]
#   ./scripts/assets-cache.sh ensure-all [--build-type Debug|Release]
#
# Environment:
#   PIXELANEA_ASSETS_CACHE  cache root (default: <repo>/.cache/assets)
#   CMAKE_BUILD_TYPE        included in hash for server binaries (default: Debug)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_ROOT="${PIXELANEA_ASSETS_CACHE:-${ROOT_DIR}/.cache/assets}"
BUILD_TYPE="${CMAKE_BUILD_TYPE:-Debug}"

API_CLIENT_MARKER="${ROOT_DIR}/packages/api-client/.pixelanea-assets-hash"
WEB_DIST_MARKER="${ROOT_DIR}/apps/web/dist/.pixelanea-assets-hash"
PUBLIC_MARKER="${ROOT_DIR}/apps/web/public/.pixelanea-assets-hash"
SERVER_MARKER="${ROOT_DIR}/server/build/.pixelanea-assets-hash"

BRAND_ARCHIVE="brand-public.tar.gz"
API_ARCHIVE="api-client.tar.gz"
WEB_ARCHIVE="web-dist.tar.gz"
SERVER_ARCHIVE="server-binaries.tar.gz"

resolve_cmake_bin() {
  if command -v cmake >/dev/null 2>&1; then
    command -v cmake
    return 0
  fi
  if [[ -x "${ROOT_DIR}/.venv-build/bin/cmake" ]]; then
    echo "${ROOT_DIR}/.venv-build/bin/cmake"
    return 0
  fi
  echo "cmake not found. Install cmake or create ${ROOT_DIR}/.venv-build." >&2
  return 1
}

assets_hash() {
  python3 "${ROOT_DIR}/scripts/assets-hash.py" --build-type "${BUILD_TYPE}"
}

cache_dir_for_hash() {
  echo "${CACHE_ROOT}/$1"
}

marker_matches() {
  local marker="$1"
  local hash="$2"
  [[ -f "${marker}" ]] && [[ "$(tr -d '[:space:]' < "${marker}")" == "${hash}" ]]
}

write_marker() {
  local marker="$1"
  local hash="$2"
  mkdir -p "$(dirname "${marker}")"
  echo "${hash}" > "${marker}"
}

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

PYTHON_SCRIPTS_VENV="${ROOT_DIR}/.cache/venv-scripts"
PYTHON_SCRIPTS_BIN=""

ensure_python_script_deps() {
  if python3 -c "from PIL import Image" 2>/dev/null; then
    return 0
  fi
  if [[ -x "${PYTHON_SCRIPTS_VENV}/bin/python3" ]] \
    && "${PYTHON_SCRIPTS_VENV}/bin/python3" -c "from PIL import Image" 2>/dev/null; then
    return 0
  fi

  if [[ -d "${PYTHON_SCRIPTS_VENV}" ]]; then
    echo "==> Removing incomplete Python scripts venv..." >&2
    rm -rf "${PYTHON_SCRIPTS_VENV}"
  fi

  echo "==> Installing Python script dependencies (Pillow)..." >&2
  if ! python3 -m venv "${PYTHON_SCRIPTS_VENV}"; then
    echo "python3 -m venv failed (install python3-venv on Debian/Ubuntu)." >&2
    exit 1
  fi
  if ! "${PYTHON_SCRIPTS_VENV}/bin/pip" install --disable-pip-version-check -q \
    -r "${ROOT_DIR}/scripts/requirements.txt"; then
    echo "Failed to install scripts/requirements.txt." >&2
    exit 1
  fi
  if ! "${PYTHON_SCRIPTS_VENV}/bin/python3" -c "from PIL import Image" 2>/dev/null; then
    echo "Pillow install did not produce a working PIL import." >&2
    exit 1
  fi
}

resolve_python_scripts_bin() {
  if python3 -c "from PIL import Image" 2>/dev/null; then
    PYTHON_SCRIPTS_BIN=python3
    return 0
  fi
  if [[ -x "${PYTHON_SCRIPTS_VENV}/bin/python3" ]] \
    && "${PYTHON_SCRIPTS_VENV}/bin/python3" -c "from PIL import Image" 2>/dev/null; then
    PYTHON_SCRIPTS_BIN="${PYTHON_SCRIPTS_VENV}/bin/python3"
    return 0
  fi

  ensure_python_script_deps
  PYTHON_SCRIPTS_BIN="${PYTHON_SCRIPTS_VENV}/bin/python3"
  if [[ ! -x "${PYTHON_SCRIPTS_BIN}" ]]; then
    echo "Python scripts interpreter missing: ${PYTHON_SCRIPTS_BIN}" >&2
    exit 1
  fi
}

cmd_ensure_python_deps() {
  resolve_python_scripts_bin
  echo "==> Python script deps ready (${PYTHON_SCRIPTS_BIN})"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build-type)
        BUILD_TYPE="${2:?--build-type requires a value}"
        shift 2
        ;;
      *)
        break
        ;;
    esac
  done
  printf '%s\n' "$@"
}

cmd_hash() {
  assets_hash
}

cmd_status() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"

  echo "Asset hash:     ${hash} (build type: ${BUILD_TYPE})"
  echo "Cache root:     ${CACHE_ROOT}"
  echo "Cache dir:      ${cache_dir}"

  if marker_matches "${PUBLIC_MARKER}" "${hash}"; then
    echo "Brand/public:   hit"
  elif [[ -f "${cache_dir}/${BRAND_ARCHIVE}" ]]; then
    echo "Brand/public:   restorable"
  else
    echo "Brand/public:   miss"
  fi

  if marker_matches "${API_CLIENT_MARKER}" "${hash}" && [[ -f "${ROOT_DIR}/packages/api-client/dist/client.js" ]]; then
    echo "API client:     hit"
  elif [[ -f "${cache_dir}/${API_ARCHIVE}" ]]; then
    echo "API client:     restorable"
  else
    echo "API client:     miss"
  fi

  if marker_matches "${WEB_DIST_MARKER}" "${hash}" && [[ -f "${ROOT_DIR}/apps/web/dist/index.html" ]]; then
    echo "Web dist:       hit"
  elif [[ -f "${cache_dir}/${WEB_ARCHIVE}" ]]; then
    echo "Web dist:       restorable"
  else
    echo "Web dist:       miss"
  fi

  if marker_matches "${SERVER_MARKER}" "${hash}" && [[ -x "${ROOT_DIR}/server/build/pixelanea-server" ]]; then
    echo "Server binary:  hit"
  elif [[ -f "${cache_dir}/${SERVER_ARCHIVE}" ]]; then
    echo "Server binary:  restorable"
  else
    echo "Server binary:  miss"
  fi
}

cmd_sync_brand() {
  mkdir -p "${ROOT_DIR}/apps/web/public/favicon" "${ROOT_DIR}/apps/web/public/icons"
  for asset in logo-glyph.svg logo-lockup.svg logo-mark.svg logo-wordmark.svg app-icon.svg; do
    if [[ -f "${ROOT_DIR}/brand/${asset}" ]]; then
      cp "${ROOT_DIR}/brand/${asset}" "${ROOT_DIR}/apps/web/public/${asset}"
    fi
  done
  if [[ -f "${ROOT_DIR}/brand/logo-glyph.svg" ]]; then
    cp "${ROOT_DIR}/brand/logo-glyph.svg" "${ROOT_DIR}/apps/web/public/favicon/favicon.svg"
  fi
  if [[ -f "${ROOT_DIR}/scripts/generate-brand-pngs.py" ]]; then
    resolve_python_scripts_bin
    "${PYTHON_SCRIPTS_BIN}" "${ROOT_DIR}/scripts/generate-brand-pngs.py"
  fi
}

save_brand_archive() {
  local cache_dir="$1"
  tar -czf "${cache_dir}/${BRAND_ARCHIVE}" -C "${ROOT_DIR}/apps/web" public
}

restore_brand_archive() {
  local archive="$1"
  mkdir -p "${ROOT_DIR}/apps/web/public"
  tar -xzf "${archive}" -C "${ROOT_DIR}/apps/web"
}

cmd_ensure_brand() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}"

  if marker_matches "${PUBLIC_MARKER}" "${hash}"; then
    echo "==> Brand/public cache hit (${hash})"
    return 0
  fi

  if [[ -f "${cache_dir}/${BRAND_ARCHIVE}" ]]; then
    echo "==> Restoring brand/public from cache (${hash})"
    restore_brand_archive "${cache_dir}/${BRAND_ARCHIVE}"
    write_marker "${PUBLIC_MARKER}" "${hash}"
    return 0
  fi

  echo "==> Syncing brand assets to public (${hash})"
  cmd_sync_brand
  write_marker "${PUBLIC_MARKER}" "${hash}"
  save_brand_archive "${cache_dir}"
}

cmd_ensure_api() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}"

  cmd_ensure_brand

  if marker_matches "${API_CLIENT_MARKER}" "${hash}" \
    && [[ -f "${ROOT_DIR}/packages/api-client/dist/client.js" ]] \
    && [[ -f "${ROOT_DIR}/packages/api-client/src/generated/schema.ts" ]]; then
    echo "==> API client cache hit (${hash})"
    if [[ ! -f "${cache_dir}/${API_ARCHIVE}" ]]; then
      echo "==> Saving API client to cache (${hash})"
      tar -czf "${cache_dir}/${API_ARCHIVE}" \
        -C "${ROOT_DIR}/packages/api-client" src/generated dist
    fi
    return 0
  fi

  if [[ -f "${cache_dir}/${API_ARCHIVE}" ]]; then
    echo "==> Restoring API client from cache (${hash})"
    tar -xzf "${cache_dir}/${API_ARCHIVE}" -C "${ROOT_DIR}/packages/api-client"
    write_marker "${API_CLIENT_MARKER}" "${hash}"
    return 0
  fi

  if ! ensure_pnpm; then
    echo "pnpm not found." >&2
    exit 1
  fi

  echo "==> Building API client (${hash})"
  (
    cd "${ROOT_DIR}"
    pnpm generate:api
    pnpm --filter @pixelanea/api-client build
  )
  write_marker "${API_CLIENT_MARKER}" "${hash}"
  tar -czf "${cache_dir}/${API_ARCHIVE}" \
    -C "${ROOT_DIR}/packages/api-client" src/generated dist
}

cmd_ensure_web() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}"

  cmd_ensure_api

  if marker_matches "${WEB_DIST_MARKER}" "${hash}" \
    && [[ -f "${ROOT_DIR}/apps/web/dist/index.html" ]]; then
    echo "==> Web dist cache hit (${hash})"
    if [[ ! -f "${cache_dir}/${WEB_ARCHIVE}" ]]; then
      echo "==> Saving web dist to cache (${hash})"
      tar -czf "${cache_dir}/${WEB_ARCHIVE}" -C "${ROOT_DIR}/apps/web" dist
    fi
    return 0
  fi

  if [[ -f "${cache_dir}/${WEB_ARCHIVE}" ]]; then
    echo "==> Restoring web dist from cache (${hash})"
    tar -xzf "${cache_dir}/${WEB_ARCHIVE}" -C "${ROOT_DIR}/apps/web"
    write_marker "${WEB_DIST_MARKER}" "${hash}"
    return 0
  fi

  if ! ensure_pnpm; then
    echo "pnpm not found." >&2
    exit 1
  fi

  echo "==> Building web dist (${hash})"
  (
    cd "${ROOT_DIR}"
    pnpm --filter @pixelanea/web exec vite build
  )
  write_marker "${WEB_DIST_MARKER}" "${hash}"
  tar -czf "${cache_dir}/${WEB_ARCHIVE}" -C "${ROOT_DIR}/apps/web" dist
}

configure_server_if_needed() {
  local cmake_bin
  cmake_bin="$(resolve_cmake_bin)"
  if [[ -f "${ROOT_DIR}/server/build/CMakeCache.txt" ]]; then
    echo "==> [server] cmake configure skipped (CMakeCache.txt present)"
    return 0
  fi

  local -a args=(
    -S "${ROOT_DIR}/server"
    -B "${ROOT_DIR}/server/build"
    -DCMAKE_BUILD_TYPE="${BUILD_TYPE}"
    -DCMAKE_CXX_COMPILER="${CXX:-g++}"
    -DCMAKE_C_COMPILER="${CC:-gcc}"
  )
  if command -v ninja >/dev/null 2>&1; then
    args+=("-G" "Ninja")
  else
    args+=("-G" "Unix Makefiles")
  fi
  if [[ -n "${VCPKG_ROOT:-}" && -f "${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" ]]; then
    args+=("-DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
  fi
  if [[ -d "${ROOT_DIR}/server/build/_deps" ]] \
    && [[ -n "$(find "${ROOT_DIR}/server/build/_deps" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1)" ]]; then
    echo "==> [server] using cached FetchContent (_deps present, disconnected mode)"
    args+=(-DFETCHCONTENT_FULLY_DISCONNECTED=ON)
  fi

  echo "==> [server] cmake configure (${BUILD_TYPE})"
  "${cmake_bin}" "${args[@]}"
}

resolve_ctest_bin() {
  if command -v ctest >/dev/null 2>&1; then
    command -v ctest
    return 0
  fi
  if [[ -x "${ROOT_DIR}/.venv-build/bin/ctest" ]]; then
    echo "${ROOT_DIR}/.venv-build/bin/ctest"
    return 0
  fi
  return 1
}

ctest_registered_test_count() {
  local ctest_bin count
  if ! ctest_bin="$(resolve_ctest_bin)"; then
    return 1
  fi
  count="$("${ctest_bin}" --test-dir "${ROOT_DIR}/server/build" -N 2>/dev/null \
    | awk '/Total Tests:/ {print $3}' || echo 0)"
  [[ "${count:-0}" -gt 0 ]]
}

# Binary-only cache restores skip CTest metadata; regenerate so ctest works in CI.
ensure_server_ctest_metadata() {
  if ctest_registered_test_count; then
    return 0
  fi
  if [[ ! -x "${ROOT_DIR}/server/build/pixelanea_tests" ]]; then
    return 0
  fi
  echo "==> [server] CTest registry empty (binary cache) — regenerating test metadata"
  configure_server_if_needed
  "$(resolve_cmake_bin)" --build "${ROOT_DIR}/server/build" \
    --target pixelanea-server pixelanea_tests
}

server_archive_members() {
  local build="${ROOT_DIR}/server/build"
  local -a members=(pixelanea-server)
  if [[ -x "${build}/pixelanea_tests" ]]; then
    members+=(pixelanea_tests)
  fi
  if [[ -f "${build}/CTestTestfile.cmake" ]]; then
    members+=(CTestTestfile.cmake)
  fi
  if [[ -f "${build}/DartConfiguration.tcl" ]]; then
    members+=(DartConfiguration.tcl)
  fi
  local cmake_meta
  for cmake_meta in "${build}"/pixelanea_tests-*_include.cmake "${build}"/pixelanea_tests-*_tests.cmake; do
    if [[ -f "${cmake_meta}" ]]; then
      members+=("$(basename "${cmake_meta}")")
    fi
  done
  printf '%s\n' "${members[@]}"
}

save_server_archive() {
  local cache_dir="$1"
  local build="${ROOT_DIR}/server/build"
  local -a members=()
  while IFS= read -r member; do
    members+=("${member}")
  done < <(server_archive_members)
  if [[ ${#members[@]} -eq 0 ]]; then
    echo "ERROR: no server binaries to cache" >&2
    return 1
  fi
  tar -czf "${cache_dir}/${SERVER_ARCHIVE}" -C "${build}" "${members[@]}"
}

verify_server_binaries() {
  if [[ ! -x "${ROOT_DIR}/server/build/pixelanea-server" ]]; then
    echo "ERROR: pixelanea-server missing after build" >&2
    exit 1
  fi
  if [[ ! -x "${ROOT_DIR}/server/build/pixelanea_tests" ]]; then
    echo "ERROR: pixelanea_tests missing after build" >&2
    exit 1
  fi
}

cmd_configure_server() {
  mkdir -p "${ROOT_DIR}/server/build"
  echo "==> [server] configure: restore FetchContent deps"
  if ! "${ROOT_DIR}/scripts/deps-cache.sh" restore-backend; then
    echo "==> [server] configure: no _deps cache (will fetch via FetchContent)"
  fi
  echo "==> [server] configure: cmake"
  configure_server_if_needed
  echo "==> [server] configure: save _deps cache"
  "${ROOT_DIR}/scripts/deps-cache.sh" save-backend
}

cmd_compile_server() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}" "${ROOT_DIR}/server/build"

  if [[ ! -f "${ROOT_DIR}/server/build/CMakeCache.txt" ]]; then
    echo "ERROR: CMakeCache.txt missing — run configure-server first" >&2
    exit 1
  fi

  echo "==> [server] compile: cmake --build (${BUILD_TYPE})"
  "$(resolve_cmake_bin)" --build "${ROOT_DIR}/server/build"
  echo "==> [server] compile: verify binaries"
  verify_server_binaries
  "${ROOT_DIR}/scripts/deps-cache.sh" save-backend
  write_marker "${SERVER_MARKER}" "${hash}"
  save_server_archive "${cache_dir}"
  ensure_server_ctest_metadata
}

cmd_ensure_server() {
  local hash
  hash="$(assets_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}" "${ROOT_DIR}/server/build"

  if marker_matches "${SERVER_MARKER}" "${hash}" \
    && [[ -x "${ROOT_DIR}/server/build/pixelanea-server" ]]; then
    echo "==> Server binary cache hit (${hash})"
    if [[ ! -f "${cache_dir}/${SERVER_ARCHIVE}" ]]; then
      echo "==> Saving server binaries to cache (${hash})"
      save_server_archive "${cache_dir}"
    fi
    ensure_server_ctest_metadata
    return 0
  fi

  if [[ -f "${cache_dir}/${SERVER_ARCHIVE}" ]]; then
    echo "==> Restoring server binaries from cache (${hash})"
    tar -xzf "${cache_dir}/${SERVER_ARCHIVE}" -C "${ROOT_DIR}/server/build"
    write_marker "${SERVER_MARKER}" "${hash}"
    ensure_server_ctest_metadata
    return 0
  fi

  echo "==> Building server binaries (${hash}, ${BUILD_TYPE})"
  cmd_configure_server
  cmd_compile_server
}

cmd_ensure_all() {
  "${ROOT_DIR}/scripts/deps-cache.sh" install
  cmd_ensure_brand
  cmd_ensure_api
  cmd_ensure_web
  cmd_ensure_server
}

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

main() {
  local args
  args="$(parse_args "$@")"
  set -- ${args}

  local cmd="${1:-ensure-all}"
  shift || true

  case "${cmd}" in
    hash) cmd_hash ;;
    status) cmd_status ;;
    sync-brand) cmd_sync_brand ;;
    ensure-brand) cmd_ensure_brand ;;
    ensure-python-deps) cmd_ensure_python_deps ;;
    ensure-api) cmd_ensure_api ;;
    ensure-web) cmd_ensure_web ;;
    configure-server) cmd_configure_server ;;
    compile-server) cmd_compile_server ;;
    ensure-server) cmd_ensure_server ;;
    ensure-all) cmd_ensure_all ;;
    -h|--help) usage ;;
    *)
      echo "Unknown command: ${cmd}" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
