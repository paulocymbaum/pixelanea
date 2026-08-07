#!/usr/bin/env bash
# Shared desktop asset staging (server binary, web bundle, brand icons).
#
# Source from platform staging scripts:
#   source "${ROOT_DIR}/scripts/stage-desktop-assets.sh"
#   stage_desktop_core_assets "${TARGET_DIR}"
#
# Or invoke directly:
#   ./scripts/stage-desktop-assets.sh <target_dir>
set -euo pipefail

_STAGE_ASSETS_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

server_binary_path() {
  if [[ -f "${_STAGE_ASSETS_ROOT_DIR}/server/build/pixelanea-server.exe" ]]; then
    echo "${_STAGE_ASSETS_ROOT_DIR}/server/build/pixelanea-server.exe"
  elif [[ -f "${_STAGE_ASSETS_ROOT_DIR}/server/build/pixelanea-server" ]]; then
    echo "${_STAGE_ASSETS_ROOT_DIR}/server/build/pixelanea-server"
  else
    echo ""
  fi
}

stage_desktop_core_assets() {
  local target_dir="$1"
  local server_binary
  server_binary="$(server_binary_path)"

  if [[ -z "${server_binary}" ]]; then
    echo "stage_desktop_core_assets: missing server/build/pixelanea-server — run build-desktop first" >&2
    return 1
  fi

  if [[ ! -f "${_STAGE_ASSETS_ROOT_DIR}/apps/web/dist/index.html" ]]; then
    echo "stage_desktop_core_assets: missing apps/web/dist/index.html — run build-desktop first" >&2
    return 1
  fi

  mkdir -p "${target_dir}/web"
  install -m 755 "${server_binary}" "${target_dir}/$(basename "${server_binary}")"
  (tar -C "${_STAGE_ASSETS_ROOT_DIR}/apps/web/dist" --exclude='.pixelanea-assets-hash' -cf - .) \
    | tar -C "${target_dir}/web" -xf -
  install -m 644 "${_STAGE_ASSETS_ROOT_DIR}/brand/logo-glyph.svg" "${target_dir}/logo-glyph.svg"
  install -m 644 "${_STAGE_ASSETS_ROOT_DIR}/brand/app-icon.svg" "${target_dir}/app-icon.svg"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  stage_desktop_core_assets "${1:?usage: $0 <target_dir>}"
fi
