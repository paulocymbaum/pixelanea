#!/usr/bin/env bash
# Smoke test Linux desktop packaging (.deb structure and contents).
#
# Usage:
#   ./scripts/test-package-linux.sh
#   ./scripts/test-package-linux.sh --skip-build    # reuse existing dist artifacts
#   ./scripts/test-package-linux.sh --docker          # also install in ubuntu:22.04 container
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64) DEB_ARCH="amd64" ;;
  aarch64) DEB_ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

SKIP_BUILD=false
RUN_DOCKER=false

for arg in "$@"; do
  case "${arg}" in
    --skip-build) SKIP_BUILD=true ;;
    --docker) RUN_DOCKER=true ;;
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

DEB_FILE="${ROOT_DIR}/dist/pixelanea_${VERSION}_${DEB_ARCH}.deb"

if [[ "${SKIP_BUILD}" != true ]]; then
  "${ROOT_DIR}/scripts/package-deb.sh"
fi

if [[ ! -f "${DEB_FILE}" ]]; then
  echo "ERROR: expected .deb not found: ${DEB_FILE}" >&2
  exit 1
fi

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb not found. Install with: sudo apt install dpkg-dev" >&2
  exit 1
fi

echo "==> Verifying package structure: ${DEB_FILE}"

deb_size="$(wc -c < "${DEB_FILE}")"
if [[ "${deb_size}" -lt 100000 ]]; then
  echo "ERROR: .deb too small (${deb_size} bytes) — likely corrupt or missing data archive" >&2
  exit 1
fi

REQUIRED_PATHS=(
  "./usr/bin/pixelanea-shell"
  "./usr/bin/pixelanea-browser"
  "./usr/share/pixelanea/pixelanea-server"
  "./usr/share/pixelanea/web/index.html"
  "./usr/share/pixelanea/logo-glyph.svg"
  "./usr/share/applications/pixelanea.desktop"
  "./usr/share/applications/pixelanea-open.desktop"
  "./usr/share/mime/packages/pixelanea-pixelanea.xml"
  "./usr/share/pixmaps/pixelanea.svg"
)

if ! CONTENTS="$(dpkg-deb -c "${DEB_FILE}" 2>&1)"; then
  echo "ERROR: dpkg-deb could not list .deb contents" >&2
  echo "${CONTENTS}" >&2
  exit 1
fi
missing=0
for path in "${REQUIRED_PATHS[@]}"; do
  if ! grep -qF "${path}" <<<"${CONTENTS}"; then
    echo "MISSING: ${path}" >&2
    missing=$((missing + 1))
  fi
done

if [[ "${missing}" -gt 0 ]]; then
  echo "ERROR: ${missing} required path(s) missing from .deb" >&2
  exit 1
fi

for field in Package Version Architecture; do
  if ! dpkg-deb -I "${DEB_FILE}" 2>/dev/null | grep -qE "^ ${field}:"; then
    echo "ERROR: .deb missing control field: ${field}" >&2
    exit 1
  fi
done

ctrl_list="$(dpkg-deb --ctrl-tarfile "${DEB_FILE}" | tar -t 2>/dev/null)"
for maint_script in postinst postrm; do
  if ! grep -qF "./${maint_script}" <<<"${ctrl_list}"; then
    echo "ERROR: .deb missing ${maint_script} maintainer script" >&2
    exit 1
  fi
done

if grep -q 'fuser -k' <<<"$(dpkg-deb --fsys-tarfile "${DEB_FILE}" | tar -xO ./usr/bin/pixelanea-browser 2>/dev/null)"; then
  echo "ERROR: browser launcher must not use silent fuser -k" >&2
  exit 1
fi

if ! grep -q 'handle_port_in_use' <<<"$(dpkg-deb --fsys-tarfile "${DEB_FILE}" | tar -xO ./usr/bin/pixelanea-browser 2>/dev/null)"; then
  echo "ERROR: browser launcher missing port-in-use policy" >&2
  exit 1
fi

if ! grep -q 'Exec=/usr/bin/pixelanea-shell' <<<"$(dpkg-deb --fsys-tarfile "${DEB_FILE}" | tar -xO ./usr/share/applications/pixelanea.desktop 2>/dev/null)"; then
  echo "ERROR: .desktop must launch pixelanea-shell" >&2
  exit 1
fi

if ! grep -q 'application/x-pixelanea' <<<"$(dpkg-deb --fsys-tarfile "${DEB_FILE}" | tar -xO ./usr/share/mime/packages/pixelanea-pixelanea.xml 2>/dev/null)"; then
  echo "ERROR: MIME package missing application/x-pixelanea" >&2
  exit 1
fi

if ! grep -q 'pixelanea-shell %f' <<<"$(dpkg-deb --fsys-tarfile "${DEB_FILE}" | tar -xO ./usr/share/applications/pixelanea-open.desktop 2>/dev/null)"; then
  echo "ERROR: pixelanea-open.desktop must pass file path to shell" >&2
  exit 1
fi

echo "==> Package structure OK"

if [[ "${RUN_DOCKER}" == true ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "WARN: docker not available — skipping container install test" >&2
  elif ! docker info >/dev/null 2>&1; then
    echo "WARN: docker daemon not running — skipping container install test" >&2
  else
    echo "==> Docker install smoke test (ubuntu:22.04)"
    if docker run --rm \
      -v "${DEB_FILE}:/pkg/pixelanea.deb:ro" \
      ubuntu:22.04 \
      bash -euxo pipefail -c '
        apt-get update -qq
        apt-get install -y -qq ./pkg/pixelanea.deb
        test -x /usr/bin/pixelanea-shell
        command -v pixelanea-shell >/dev/null
        test -x /usr/bin/pixelanea-browser
        test -x /usr/share/pixelanea/pixelanea-server
        test -f /usr/share/pixelanea/web/index.html
        ! grep -q "fuser -k" /usr/bin/pixelanea-browser
      '; then
      echo "==> Docker install smoke test passed"
    else
      echo "WARN: docker install smoke test failed — see output above" >&2
      exit 1
    fi
  fi
fi

echo ""
echo "Linux package smoke test passed:"
echo "  ${DEB_FILE}"
