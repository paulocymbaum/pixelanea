#!/usr/bin/env bash
# Smoke test macOS desktop packaging (DMG + portable .app zip structure and optional install).
#
# Usage:
#   ./scripts/test-package-macos.sh
#   ./scripts/test-package-macos.sh --skip-build
#   ./scripts/test-package-macos.sh --skip-build --install-test
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
DIST_DIR="${ROOT_DIR}/dist"
HEALTH_URL="http://127.0.0.1:8787/api/health"
APP_NAME="Pixelanea.app"

SKIP_BUILD=false
RUN_INSTALL_TEST=false

for arg in "$@"; do
  case "${arg}" in
    --skip-build) SKIP_BUILD=true ;;
    --install-test) RUN_INSTALL_TEST=true ;;
    -h|--help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: macOS package smoke test requires a Darwin host" >&2
  exit 1
fi

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

if [[ "${SKIP_BUILD}" != true ]]; then
  "${ROOT_DIR}/scripts/package-dmg.sh"
fi

assert_file_exists() {
  local path="$1"
  local min_bytes="${2:-1}"
  if [[ ! -f "${path}" ]]; then
    echo "ERROR: missing required artifact: ${path}" >&2
    exit 1
  fi
  local size
  size="$(wc -c < "${path}")"
  if [[ "${size}" -lt "${min_bytes}" ]]; then
    echo "ERROR: artifact too small (${size} bytes): ${path}" >&2
    exit 1
  fi
}

verify_app_layout() {
  local app_root="$1"
  local required=(
    "Contents/MacOS/pixelanea-shell"
    "Contents/Resources/pixelanea/pixelanea-server"
    "Contents/Resources/pixelanea/web/index.html"
    "Contents/Resources/pixelanea/logo-glyph.svg"
  )
  local rel missing=0
  for rel in "${required[@]}"; do
    if [[ ! -e "${app_root}/${rel}" ]]; then
      echo "MISSING: ${rel}" >&2
      missing=$((missing + 1))
    fi
  done
  if [[ "${missing}" -gt 0 ]]; then
    echo "ERROR: ${missing} required path(s) missing from ${app_root}" >&2
    exit 1
  fi
  if [[ ! -x "${app_root}/Contents/MacOS/pixelanea-shell" ]]; then
    echo "ERROR: pixelanea-shell is not executable" >&2
    exit 1
  fi
  if [[ ! -x "${app_root}/Contents/Resources/pixelanea/pixelanea-server" ]]; then
    echo "ERROR: pixelanea-server is not executable" >&2
    exit 1
  fi
}

wait_for_health() {
  local url="$1"
  local attempts="${2:-50}"
  local i=0
  while [[ "${i}" -lt "${attempts}" ]]; do
    if curl -fsS --max-time 2 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
    i=$((i + 1))
  done
  echo "ERROR: health check failed: ${url}" >&2
  return 1
}

echo "==> Verifying release artifacts"
assert_file_exists "${DMG_FILE}" 1000000
assert_file_exists "${PORTABLE_ZIP}" 100000

TEMP_EXTRACT="$(mktemp -d "${TMPDIR:-/tmp}/pixelanea-macos-smoke-XXXXXX")"
cleanup() {
  rm -rf "${TEMP_EXTRACT}"
}
trap cleanup EXIT

echo "==> Verifying portable zip layout"
unzip -q "${PORTABLE_ZIP}" -d "${TEMP_EXTRACT}"
APP_ROOT="${TEMP_EXTRACT}/${APP_NAME}"
README_FILE="${TEMP_EXTRACT}/README.txt"
if [[ ! -d "${APP_ROOT}" ]]; then
  echo "ERROR: portable zip did not contain ${APP_NAME}" >&2
  exit 1
fi
if [[ ! -f "${README_FILE}" ]]; then
  echo "ERROR: portable zip did not contain README.txt" >&2
  exit 1
fi
if ! grep -qE 'Privacy & Security|xattr -dr com.apple.quarantine' "${README_FILE}"; then
  echo "ERROR: README.txt missing Gatekeeper / open instructions" >&2
  exit 1
fi
verify_app_layout "${APP_ROOT}"

if [[ "${RUN_INSTALL_TEST}" == true ]]; then
  INSTALL_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/pixelanea-macos-install-XXXXXX")"
  MOUNT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pixelanea-macos-mount-XXXXXX")"
  SERVER_PID=""

  install_cleanup() {
    if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
      kill "${SERVER_PID}" 2>/dev/null || true
      wait "${SERVER_PID}" 2>/dev/null || true
    fi
    if mountpoint -q "${MOUNT_DIR}" 2>/dev/null || [[ -d "${MOUNT_DIR}/${APP_NAME}" ]]; then
      hdiutil detach -quiet "${MOUNT_DIR}" 2>/dev/null || true
    fi
    rm -rf "${INSTALL_ROOT}" "${MOUNT_DIR}"
  }
  trap install_cleanup EXIT

  echo "==> DMG mount + install smoke test"
  if ! hdiutil attach -nobrowse -quiet -mountpoint "${MOUNT_DIR}" "${DMG_FILE}"; then
    if [[ "${CI:-}" == "true" ]]; then
      echo "WARN: could not mount DMG in CI — skipping install smoke test" >&2
    else
      echo "ERROR: could not mount DMG: ${DMG_FILE}" >&2
      exit 1
    fi
  else
    if [[ ! -d "${MOUNT_DIR}/${APP_NAME}" ]]; then
      echo "ERROR: DMG did not contain ${APP_NAME}" >&2
      exit 1
    fi
    cp -R "${MOUNT_DIR}/${APP_NAME}" "${INSTALL_ROOT}/"
    hdiutil detach -quiet "${MOUNT_DIR}" || true

    INSTALLED_APP="${INSTALL_ROOT}/${APP_NAME}"
    verify_app_layout "${INSTALLED_APP}"

    SERVER_BIN="${INSTALLED_APP}/Contents/Resources/pixelanea/pixelanea-server"
    WEB_ROOT="${INSTALLED_APP}/Contents/Resources/pixelanea/web"
    "${SERVER_BIN}" --host 127.0.0.1 --port 8787 --web-root "${WEB_ROOT}" &
    SERVER_PID=$!
    wait_for_health "${HEALTH_URL}"
    echo "==> Health check OK"
  fi
fi

echo ""
echo "macOS package smoke test passed:"
echo "  ${DMG_FILE}"
echo "  ${PORTABLE_ZIP}"
