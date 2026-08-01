#!/usr/bin/env bash
# Package a portable Pixelanea release for Linux (Debian/Ubuntu amd64).
#
# Usage:
#   ./scripts/package-desktop-linux.sh
#
# Output:
#   dist/pixelanea-<version>-linux-amd64.tar.gz
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64) ARCH_LABEL="amd64" ;;
  aarch64) ARCH_LABEL="arm64" ;;
  *)
    echo "Unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

STAGING="${ROOT_DIR}/dist/pixelanea-${VERSION}-linux-${ARCH_LABEL}"
ARCHIVE="${ROOT_DIR}/dist/pixelanea-${VERSION}-linux-${ARCH_LABEL}.tar.gz"

"${ROOT_DIR}/scripts/build-desktop.sh"

rm -rf "${STAGING}"
mkdir -p "${STAGING}/web"

install -m 755 "${ROOT_DIR}/server/build/pixelanea-server" "${STAGING}/pixelanea-server"
cp -a "${ROOT_DIR}/apps/web/dist/." "${STAGING}/web/"
install -m 644 "${ROOT_DIR}/brand/logo-glyph.svg" "${STAGING}/logo-glyph.svg"

cat >"${STAGING}/pixelanea" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="127.0.0.1"
PORT="8787"
APP_URL="http://${HOST}:${PORT}"
BINARY="${INSTALL_DIR}/pixelanea-server"
WEB_ROOT="${INSTALL_DIR}/web"

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

if port_in_use; then
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 0.5
  fi
fi

if ! command -v zenity >/dev/null 2>&1; then
  echo "Note: install zenity for native Open/Save dialogs (e.g. sudo apt install zenity)." >&2
  echo "Without zenity, use the path dialog in the app to open or save .pixelanea files." >&2
fi

"${BINARY}" --host "${HOST}" --port "${PORT}" --web-root "${WEB_ROOT}" &
SERVER_PID=$!

cleanup() {
  kill "${SERVER_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if command -v curl >/dev/null 2>&1; then
  for _ in $(seq 1 50); do
    if curl -sf "${APP_URL}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
else
  sleep 2
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${APP_URL}" >/dev/null 2>&1 &
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "${APP_URL}" >/dev/null 2>&1 &
else
  echo "Pixelanea is running at ${APP_URL}"
fi

wait "${SERVER_PID}"
EOF
chmod 755 "${STAGING}/pixelanea"

cat >"${STAGING}/install.sh" <<'EOF'
#!/usr/bin/env bash
# Install Pixelanea for the current user (no root required).
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_PREFIX="${HOME}/.local/share/pixelanea"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"

mkdir -p "${INSTALL_PREFIX}" "${BIN_DIR}" "${DESKTOP_DIR}"

install -m 755 "${SOURCE_DIR}/pixelanea-server" "${INSTALL_PREFIX}/pixelanea-server"
rm -rf "${INSTALL_PREFIX}/web"
cp -a "${SOURCE_DIR}/web" "${INSTALL_PREFIX}/web"
install -m 644 "${SOURCE_DIR}/logo-glyph.svg" "${INSTALL_PREFIX}/logo-glyph.svg"

cat >"${INSTALL_PREFIX}/pixelanea-launch.sh" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="127.0.0.1"
PORT="8787"
APP_URL="http://${HOST}:${PORT}"
BINARY="${INSTALL_DIR}/pixelanea-server"
WEB_ROOT="${INSTALL_DIR}/web"

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

if port_in_use; then
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 0.5
  fi
fi

if ! command -v zenity >/dev/null 2>&1; then
  echo "Note: install zenity for native Open/Save dialogs (e.g. sudo apt install zenity)." >&2
  echo "Without zenity, use the path dialog in the app to open or save .pixelanea files." >&2
fi

"${BINARY}" --host "${HOST}" --port "${PORT}" --web-root "${WEB_ROOT}" &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT INT TERM

if command -v curl >/dev/null 2>&1; then
  for _ in $(seq 1 50); do
    curl -sf "${APP_URL}/api/health" >/dev/null 2>&1 && break
    sleep 0.2
  done
else
  sleep 2
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${APP_URL}" >/dev/null 2>&1 &
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "${APP_URL}" >/dev/null 2>&1 &
fi

wait "${SERVER_PID}"
LAUNCHER
chmod 755 "${INSTALL_PREFIX}/pixelanea-launch.sh"

ln -sf "${INSTALL_PREFIX}/pixelanea-launch.sh" "${BIN_DIR}/pixelanea"

cat >"${DESKTOP_DIR}/pixelanea.desktop" <<DESKTOP
[Desktop Entry]
Version=1.0
Type=Application
Name=Pixelanea
GenericName=Pixel Art Editor
Comment=Make pixel art. Keep it local.
Exec=${INSTALL_PREFIX}/pixelanea-launch.sh
Icon=${INSTALL_PREFIX}/logo-glyph.svg
Terminal=false
Categories=Graphics;2DGraphics;
Keywords=pixel;art;editor;animation;
StartupNotify=true
DESKTOP
chmod 644 "${DESKTOP_DIR}/pixelanea.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true
fi

echo "Pixelanea installed."
echo "  Run: pixelanea"
echo "  Or open Pixelanea from your application menu."
EOF
chmod 755 "${STAGING}/install.sh"

cat >"${STAGING}/README.txt" <<EOF
Pixelanea ${VERSION} — Linux ${ARCH_LABEL}

Quick start (portable, no install):
  tar -xzf pixelanea-${VERSION}-linux-${ARCH_LABEL}.tar.gz
  cd pixelanea-${VERSION}-linux-${ARCH_LABEL}
  ./pixelanea

Install for current user (~/.local):
  ./install.sh

Requires: Debian/Ubuntu-style Linux with glibc, curl, and a web browser.
Optional: zenity (sudo apt install zenity) for native file Open/Save dialogs.
EOF

mkdir -p "${ROOT_DIR}/dist"
tar -czf "${ARCHIVE}" -C "${ROOT_DIR}/dist" "pixelanea-${VERSION}-linux-${ARCH_LABEL}"

echo ""
echo "Release package ready:"
echo "  Folder:  ${STAGING}"
echo "  Archive: ${ARCHIVE}"
echo ""
echo "Portable run:"
echo "  cd ${STAGING} && ./pixelanea"
echo ""
echo "Install to ~/.local:"
echo "  ${STAGING}/install.sh"
