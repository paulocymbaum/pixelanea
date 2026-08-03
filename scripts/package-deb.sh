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
#   sudo apt install ./dist/pixelanea_<version>_amd64.deb
#   sudo apt-get install -f    # only if dependency errors appear
#
# Install (GUI):
#   Double-click the .deb file (GNOME Software, GDebi, etc.)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=stage-linux-desktop.sh
source "${ROOT_DIR}/scripts/stage-linux-desktop.sh"

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
STAGING_DIR="${ROOT_DIR}/dist/.deb-staging"
PKG_ROOT="${STAGING_DIR}/${PKG_NAME}_${VERSION}_${DEB_ARCH}"
DEB_FILE="${ROOT_DIR}/dist/${PKG_NAME}_${VERSION}_${DEB_ARCH}.deb"
APP_DIR="usr/share/pixelanea"

"${ROOT_DIR}/scripts/build-desktop.sh"

rm -rf "${PKG_ROOT}"
mkdir -p "${PKG_ROOT}/DEBIAN"
mkdir -p "${PKG_ROOT}/${APP_DIR}"
mkdir -p "${PKG_ROOT}/usr/bin"
mkdir -p "${PKG_ROOT}/usr/share/applications"
mkdir -p "${PKG_ROOT}/usr/share/pixmaps"

stage_linux_desktop_assets "${PKG_ROOT}/${APP_DIR}"
install -m 644 "${ROOT_DIR}/brand/logo-glyph.svg" "${PKG_ROOT}/usr/share/pixmaps/pixelanea.svg"
write_linux_desktop_launcher "${PKG_ROOT}/usr/bin/pixelanea" system

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
Depends: libc6 (>= 2.35), curl
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
tmp_deb="$(mktemp "${ROOT_DIR}/dist/.${PKG_NAME}_${VERSION}_${DEB_ARCH}.XXXXXX.deb")"
dpkg-deb --build --root-owner-group "${PKG_ROOT}" "${tmp_deb}"
mv -f "${tmp_deb}" "${DEB_FILE}"

echo ""
echo "Debian package ready:"
echo "  ${DEB_FILE}"
echo ""
echo "Install:"
echo "  sudo apt install ./${DEB_FILE##*/}"
echo ""
echo "Or double-click the .deb file in your file manager."
echo "After install, run: pixelanea  (or open from the application menu)"
