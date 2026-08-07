#!/usr/bin/env bash
# Stage macOS desktop assets for Tauri DMG bundle and portable zip.
#
# Source from other scripts:
#   source "${ROOT_DIR}/scripts/stage-macos-desktop.sh"
#   stage_macos_desktop_assets "${TARGET_DIR}"
#
# Or invoke directly:
#   ./scripts/stage-macos-desktop.sh bundle
#   ./scripts/stage-macos-desktop.sh portable <output_dir>
set -euo pipefail

_STAGE_MACOS_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=stage-desktop-assets.sh
source "${_STAGE_MACOS_ROOT_DIR}/scripts/stage-desktop-assets.sh"

stage_macos_desktop_assets() {
  stage_desktop_core_assets "$1"
}

stage_macos_bundle_resources() {
  local bundle_resources="${_STAGE_MACOS_ROOT_DIR}/apps/desktop/src-tauri/bundle-resources/pixelanea"
  rm -rf "${bundle_resources}"
  mkdir -p "${bundle_resources}"
  stage_macos_desktop_assets "${bundle_resources}"
  echo "Staged Tauri bundle resources: ${bundle_resources}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    bundle)
      stage_macos_bundle_resources
      ;;
    portable)
      stage_macos_desktop_assets "${2:?usage: $0 portable <output_dir>}"
      ;;
    -h|--help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Usage: $0 bundle | portable <output_dir>" >&2
      exit 1
      ;;
  esac
fi
