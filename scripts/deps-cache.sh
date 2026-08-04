#!/usr/bin/env bash
# Hash-keyed dependency cache for frontend (pnpm) and backend (CMake FetchContent _deps).
#
# Usage:
#   ./scripts/deps-cache.sh hash              # print current dependency hash
#   ./scripts/deps-cache.sh install           # restore or pnpm install + cache save
#   ./scripts/deps-cache.sh restore-backend   # restore server/build/_deps from cache
#   ./scripts/deps-cache.sh save-backend      # save server/build/_deps to cache
#   ./scripts/deps-cache.sh status            # show hit/miss state
#
# Environment:
#   PIXELANEA_DEPS_CACHE  cache root (default: <repo>/.cache/deps)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_ROOT="${PIXELANEA_DEPS_CACHE:-${ROOT_DIR}/.cache/deps}"
MARKER="${ROOT_DIR}/node_modules/.pixelanea-deps-hash"
FRONTEND_ARCHIVE="frontend-node-modules.tar.gz"
BACKEND_ARCHIVE="backend-cmake-deps.tar.gz"

deps_hash() {
  python3 "${ROOT_DIR}/scripts/deps-hash.py"
}

cache_dir_for_hash() {
  echo "${CACHE_ROOT}/$1"
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

frontend_paths_present() {
  [[ -d "${ROOT_DIR}/node_modules" ]]
}

write_marker() {
  local hash="$1"
  mkdir -p "${ROOT_DIR}/node_modules"
  echo "${hash}" > "${MARKER}"
}

marker_matches() {
  local hash="$1"
  [[ -f "${MARKER}" ]] && [[ "$(tr -d '[:space:]' < "${MARKER}")" == "${hash}" ]]
}

archive_frontend_paths() {
  local dest="$1"
  local -a paths=(node_modules)
  [[ -d apps/web/node_modules ]] && paths+=(apps/web/node_modules)
  [[ -d packages/api-client/node_modules ]] && paths+=(packages/api-client/node_modules)

  tar -czf "${dest}" -C "${ROOT_DIR}" "${paths[@]}"
}

restore_frontend_archive() {
  local archive="$1"
  tar -xzf "${archive}" -C "${ROOT_DIR}"
}

cmd_hash() {
  deps_hash
}

cmd_status() {
  local hash
  hash="$(deps_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"

  echo "Dependency hash: ${hash}"
  echo "Cache root:      ${CACHE_ROOT}"
  echo "Cache dir:       ${cache_dir}"

  if marker_matches "${hash}" && frontend_paths_present; then
    echo "Frontend:        hit (marker + node_modules)"
  elif [[ -f "${cache_dir}/${FRONTEND_ARCHIVE}" ]]; then
    echo "Frontend:        restorable archive"
  else
    echo "Frontend:        miss"
  fi

  if [[ -f "${cache_dir}/${BACKEND_ARCHIVE}" ]]; then
    echo "Backend _deps:   archive present"
  else
    echo "Backend _deps:   miss"
  fi
}

cmd_install() {
  local hash
  hash="$(deps_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}"

  if marker_matches "${hash}" && frontend_paths_present; then
    echo "==> Dependency cache hit (${hash}) — skipping pnpm install"
    if [[ ! -f "${cache_dir}/${FRONTEND_ARCHIVE}" ]]; then
      echo "==> Saving frontend dependencies to cache (${hash})"
      archive_frontend_paths "${cache_dir}/${FRONTEND_ARCHIVE}"
    fi
    "${ROOT_DIR}/scripts/assets-cache.sh" ensure-python-deps
    return 0
  fi

  if frontend_paths_present; then
    if ! ensure_pnpm; then
      echo "pnpm not found." >&2
      exit 1
    fi
    echo "==> Verifying restored node_modules (${hash})"
    (
      cd "${ROOT_DIR}"
      pnpm install --frozen-lockfile --prefer-offline
    )
    write_marker "${hash}"
    if [[ ! -f "${cache_dir}/${FRONTEND_ARCHIVE}" ]]; then
      echo "==> Saving frontend dependencies to cache (${hash})"
      archive_frontend_paths "${cache_dir}/${FRONTEND_ARCHIVE}"
    fi
    "${ROOT_DIR}/scripts/assets-cache.sh" ensure-python-deps
    return 0
  fi

  if [[ -f "${cache_dir}/${FRONTEND_ARCHIVE}" ]]; then
    echo "==> Restoring frontend dependencies from cache (${hash})"
    restore_frontend_archive "${cache_dir}/${FRONTEND_ARCHIVE}"
    write_marker "${hash}"
    echo "==> Frontend restore complete"
    "${ROOT_DIR}/scripts/assets-cache.sh" ensure-python-deps
    return 0
  fi

  if ! ensure_pnpm; then
    echo "pnpm not found. Install with: corepack enable && corepack prepare pnpm@9.15.4 --activate" >&2
    exit 1
  fi

  echo "==> Dependency cache miss (${hash}) — running pnpm install"
  (
    cd "${ROOT_DIR}"
    pnpm install --frozen-lockfile
  )

  write_marker "${hash}"
  echo "==> Saving frontend dependencies to cache (${hash})"
  archive_frontend_paths "${cache_dir}/${FRONTEND_ARCHIVE}"
  echo "==> Frontend install complete"

  echo "==> Ensuring Python script dependencies"
  "${ROOT_DIR}/scripts/assets-cache.sh" ensure-python-deps
}

cmd_restore_backend() {
  local hash
  hash="$(deps_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  local archive="${cache_dir}/${BACKEND_ARCHIVE}"

  if [[ ! -f "${archive}" ]]; then
    echo "==> No backend dependency cache for hash ${hash}"
    return 1
  fi

  echo "==> Restoring backend FetchContent deps from cache (${hash})"
  mkdir -p "${ROOT_DIR}/server/build"
  tar -xzf "${archive}" -C "${ROOT_DIR}/server/build"
  echo "==> Backend _deps restore complete"
}

cmd_save_backend() {
  local hash
  hash="$(deps_hash)"
  local cache_dir
  cache_dir="$(cache_dir_for_hash "${hash}")"
  mkdir -p "${cache_dir}"

  if [[ ! -d "${ROOT_DIR}/server/build/_deps" ]]; then
    echo "==> Nothing to save — server/build/_deps not found"
    return 0
  fi

  echo "==> Saving backend FetchContent deps to cache (${hash})"
  tar -czf "${cache_dir}/${BACKEND_ARCHIVE}" -C "${ROOT_DIR}/server/build" _deps
  echo "==> Backend _deps saved"
}

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

main() {
  local cmd="${1:-install}"
  case "${cmd}" in
    hash) cmd_hash ;;
    status) cmd_status ;;
    install) cmd_install ;;
    restore-backend) cmd_restore_backend ;;
    save-backend) cmd_save_backend ;;
    -h|--help) usage ;;
    *)
      echo "Unknown command: ${cmd}" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
