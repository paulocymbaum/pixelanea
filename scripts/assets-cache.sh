#!/usr/bin/env bash
# Hash-keyed build asset cache (brand/public, API client, web dist, server binaries).
#
# Usage:
#   ./scripts/assets-cache.sh hash [--build-type Debug|Release]
#   ./scripts/assets-cache.sh status [--build-type Debug|Release]
#   ./scripts/assets-cache.sh sync-brand
#   ./scripts/assets-cache.sh ensure-api
#   ./scripts/assets-cache.sh ensure-web [--build-type Debug|Release]
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
  mkdir -p "${ROOT_DIR}/apps/web/public"
  if [[ -f "${ROOT_DIR}/brand/logo-glyph.svg" ]]; then
    cp "${ROOT_DIR}/brand/logo-glyph.svg" "${ROOT_DIR}/apps/web/public/logo-glyph.svg"
  fi
  if [[ -f "${ROOT_DIR}/brand/logo-lockup.svg" ]]; then
    cp "${ROOT_DIR}/brand/logo-lockup.svg" "${ROOT_DIR}/apps/web/public/logo-lockup.svg"
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
  if [[ ! -f "${ROOT_DIR}/server/build/CMakeCache.txt" ]]; then
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
    "${cmake_bin}" "${args[@]}"
  fi
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
      tar -czf "${cache_dir}/${SERVER_ARCHIVE}" \
        -C "${ROOT_DIR}/server/build" pixelanea-server pixelanea_tests 2>/dev/null \
        || tar -czf "${cache_dir}/${SERVER_ARCHIVE}" \
          -C "${ROOT_DIR}/server/build" pixelanea-server
    fi
    return 0
  fi

  if [[ -f "${cache_dir}/${SERVER_ARCHIVE}" ]]; then
    echo "==> Restoring server binaries from cache (${hash})"
    tar -xzf "${cache_dir}/${SERVER_ARCHIVE}" -C "${ROOT_DIR}/server/build"
    write_marker "${SERVER_MARKER}" "${hash}"
    return 0
  fi

  echo "==> Building server binaries (${hash}, ${BUILD_TYPE})"
  "${ROOT_DIR}/scripts/deps-cache.sh" restore-backend || true
  configure_server_if_needed
  "$(resolve_cmake_bin)" --build "${ROOT_DIR}/server/build"
  "${ROOT_DIR}/scripts/deps-cache.sh" save-backend
  write_marker "${SERVER_MARKER}" "${hash}"
  tar -czf "${cache_dir}/${SERVER_ARCHIVE}" \
    -C "${ROOT_DIR}/server/build" pixelanea-server pixelanea_tests 2>/dev/null \
    || tar -czf "${cache_dir}/${SERVER_ARCHIVE}" \
      -C "${ROOT_DIR}/server/build" pixelanea-server
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
    ensure-api) cmd_ensure_api ;;
    ensure-web) cmd_ensure_web ;;
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
