#!/usr/bin/env bash
# Package Pixelanea for macOS (DMG installer + portable .app zip).
#
# Usage:
#   ./scripts/package-dmg.sh
#   ./scripts/package-dmg.sh --skip-build
#
# Output (macos-14 arm64 CI):
#   dist/pixelanea-{version}-macos-arm64.dmg
#   dist/pixelanea-{version}-macos-arm64.zip
#
# Requires: macOS host, Xcode CLT, Rust, Tauri CLI.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: DMG packaging requires a macOS (Darwin) host" >&2
  echo "Use GitHub Actions workflow package-macos.yml or release-macos on macos-14." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=stage-macos-desktop.sh
source "${ROOT_DIR}/scripts/stage-macos-desktop.sh"

SKIP_BUILD=0
if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=1
fi

VERSION="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
TAURI_DIR="${ROOT_DIR}/apps/desktop/src-tauri"
DIST_DIR="${ROOT_DIR}/dist"

ARCH="$(uname -m)"
case "${ARCH}" in
  arm64|aarch64) MAC_ARCH="arm64" ;;
  x86_64) MAC_ARCH="x64" ;;
  *)
    echo "Unsupported macOS architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

DMG_FILE="${DIST_DIR}/pixelanea-${VERSION}-macos-${MAC_ARCH}.dmg"
PORTABLE_ZIP="${DIST_DIR}/pixelanea-${VERSION}-macos-${MAC_ARCH}.zip"

find_dmg_artifact() {
  local bundle_dir="${TAURI_DIR}/target/release/bundle/dmg"
  if [[ ! -d "${bundle_dir}" ]]; then
    echo "DMG bundle directory missing: ${bundle_dir}" >&2
    return 1
  fi
  local dmg
  dmg="$(find "${bundle_dir}" -maxdepth 1 -name '*.dmg' -type f | head -n 1)"
  if [[ -z "${dmg}" ]]; then
    echo "No DMG artifact found under ${bundle_dir}" >&2
    return 1
  fi
  printf '%s' "${dmg}"
}

create_portable_zip_from_dmg() {
  local dmg_path="$1"
  local app_name="Pixelanea.app"
  local mount_dir
  mount_dir="$(mktemp -d "${TMPDIR:-/tmp}/pixelanea-dmg-mount-XXXXXX")"

  if ! hdiutil attach -nobrowse -quiet -mountpoint "${mount_dir}" "${dmg_path}"; then
    rm -rf "${mount_dir}"
    echo "ERROR: could not mount DMG: ${dmg_path}" >&2
    return 1
  fi

  if [[ ! -d "${mount_dir}/${app_name}" ]]; then
    hdiutil detach -quiet "${mount_dir}" 2>/dev/null || true
    rm -rf "${mount_dir}"
    echo "ERROR: DMG did not contain ${app_name}" >&2
    return 1
  fi

  if [[ -f "${PORTABLE_ZIP}" ]]; then
    rm -f "${PORTABLE_ZIP}"
  fi
  (
    cd "${mount_dir}"
    zip -r -q "${PORTABLE_ZIP}" "${app_name}"
  )

  hdiutil detach -quiet "${mount_dir}" || true
  rm -rf "${mount_dir}"
}

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  "${ROOT_DIR}/scripts/build-desktop.sh"

  echo "==> Staging Tauri bundle resources"
  stage_macos_bundle_resources

  echo "==> Building pixelanea-shell (release, dmg bundle)"
  if [[ -z "${TAURI_CLI_VERSION:-}" ]]; then
    export TAURI_CLI_VERSION="2.0.0"
  fi
  if ! command -v cargo-tauri >/dev/null 2>&1 && ! cargo tauri --version >/dev/null 2>&1; then
    cargo install tauri-cli --version "${TAURI_CLI_VERSION}" --locked
  fi
  (cd "${TAURI_DIR}" && cargo tauri build --bundles dmg)
fi

mkdir -p "${DIST_DIR}"

DMG_SOURCE="$(find_dmg_artifact)"
cp -f "${DMG_SOURCE}" "${DMG_FILE}"

echo "==> Creating portable zip from DMG"
create_portable_zip_from_dmg "${DMG_FILE}"

echo ""
echo "macOS release package ready:"
echo "  DMG:      ${DMG_FILE}"
echo "  Portable: ${PORTABLE_ZIP}"
echo ""
echo "Install:"
echo "  open ${DMG_FILE}"
