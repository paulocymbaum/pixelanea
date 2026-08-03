#!/usr/bin/env bash
# Package Pixelanea as a Debian .deb installer (amd64/arm64).
#
# Usage:
#   ./scripts/package-deb.sh
#
# Output:
#   dist/pixelanea_<version>_<arch>.deb
#
# Install (terminal):
#   sudo dpkg -i dist/pixelanea_<version>_amd64.deb
#   sudo apt-get install -f    # only if dependency errors appear
#
# Install (GUI):
#   Double-click the .deb file (GNOME Software, GDebi, etc.)
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

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb not found. Install with: sudo apt install dpkg-dev" >&2
  exit 1
fi

PKG_NAME="pixelanea"
PKG_ROOT="${ROOT_DIR}/dist/${PKG_NAME}_${VERSION}_${DEB_ARCH}"
DEB_FILE="${ROOT_DIR}/dist/${PKG_NAME}_${VERSION}_${DEB_ARCH}.deb"
APP_DIR="usr/share/pixelanea"

"${ROOT_DIR}/scripts/build-desktop.sh"

rm -rf "${PKG_ROOT}"
mkdir -p "${PKG_ROOT}/DEBIAN"
mkdir -p "${PKG_ROOT}/${APP_DIR}/web"
mkdir -p "${PKG_ROOT}/usr/bin"
mkdir -p "${PKG_ROOT}/usr/share/applications"
mkdir -p "${PKG_ROOT}/usr/share/pixmaps"

install -m 755 "${ROOT_DIR}/server/build/pixelanea-server" "${PKG_ROOT}/${APP_DIR}/pixelanea-server"
cp -a "${ROOT_DIR}/apps/web/dist/." "${PKG_ROOT}/${APP_DIR}/web/"
install -m 644 "${ROOT_DIR}/brand/logo-glyph.svg" "${PKG_ROOT}/${APP_DIR}/logo-glyph.svg"
install -m 644 "${ROOT_DIR}/brand/logo-glyph.svg" "${PKG_ROOT}/usr/share/pixmaps/pixelanea.svg"

cat >"${PKG_ROOT}/usr/bin/pixelanea" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="/usr/share/pixelanea"
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
  echo "Note: install zenity for native Open/Save dialogs (sudo apt install zenity)." >&2
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
chmod 755 "${PKG_ROOT}/usr/bin/pixelanea"

cat >"${PKG_ROOT}/usr/share/applications/pixelanea.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Pixelanea
GenericName=Pixel Art Editor
Comment=Make pixel art. Keep it local.
Exec=/usr/bin/pixelanea
Icon=pixelanea
Terminal=false
Categories=Graphics;2DGraphics;
Keywords=pixel;art;editor;animation;
StartupNotify=true
EOF

cat >"${PKG_ROOT}/DEBIAN/control" <<EOF
Package: ${PKG_NAME}
Version: ${VERSION}
Section: graphics
Priority: optional
Architecture: ${DEB_ARCH}
Depends: curl
Recommends: zenity, xdg-utils
Maintainer: Pixelanea contributors <pixelanea@localhost>
Homepage: https://github.com/pixelanea/pixelanea
Description: Local-first pixel art editor
 Pixelanea is a free pixel art editor that runs entirely on your computer.
 Draw on a grid, pixelate photos, animate frames, and save portable
 .pixelanea project files — no accounts or cloud required.
EOF

cat >"${PKG_ROOT}/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi
EOF
chmod 755 "${PKG_ROOT}/DEBIAN/postinst"

cat >"${PKG_ROOT}/DEBIAN/postrm" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi
EOF
chmod 755 "${PKG_ROOT}/DEBIAN/postrm"

mkdir -p "${ROOT_DIR}/dist"
dpkg-deb --build --root-owner-group "${PKG_ROOT}" "${DEB_FILE}"

echo ""
echo "Debian package ready:"
echo "  ${DEB_FILE}"
echo ""
echo "Install:"
echo "  sudo dpkg -i ${DEB_FILE}"
echo ""
echo "Or double-click the .deb file in your file manager."
echo "After install, run: pixelanea  (or open from the application menu)"
