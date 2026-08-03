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
# shellcheck source=stage-linux-desktop.sh
source "${ROOT_DIR}/scripts/stage-linux-desktop.sh"

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
"${ROOT_DIR}/scripts/build-desktop-shell.sh"

rm -rf "${STAGING}"
mkdir -p "${STAGING}"

stage_linux_desktop_assets "${STAGING}"
stage_linux_desktop_shell_binary "${STAGING}"
write_linux_desktop_launcher "${STAGING}/pixelanea-browser" self
write_linux_desktop_launcher "${STAGING}/pixelanea-launch.sh" self
ln -sf pixelanea-shell "${STAGING}/pixelanea"

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
install -m 755 "${SOURCE_DIR}/pixelanea-shell" "${INSTALL_PREFIX}/pixelanea-shell"
rm -rf "${INSTALL_PREFIX}/web"
cp -a "${SOURCE_DIR}/web" "${INSTALL_PREFIX}/web"
install -m 644 "${SOURCE_DIR}/logo-glyph.svg" "${INSTALL_PREFIX}/logo-glyph.svg"
install -m 755 "${SOURCE_DIR}/pixelanea-browser" "${INSTALL_PREFIX}/pixelanea-browser"

ln -sf "${INSTALL_PREFIX}/pixelanea-shell" "${BIN_DIR}/pixelanea"

cat >"${DESKTOP_DIR}/pixelanea.desktop" <<DESKTOP
[Desktop Entry]
Version=1.0
Type=Application
Name=Pixelanea
GenericName=Pixel Art Editor
Comment=Make pixel art. Keep it local.
Exec=${INSTALL_PREFIX}/pixelanea-shell
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

Quick start (native window, portable — no install):
  tar -xzf pixelanea-${VERSION}-linux-${ARCH_LABEL}.tar.gz
  cd pixelanea-${VERSION}-linux-${ARCH_LABEL}
  ./pixelanea-shell

Browser fallback:
  ./pixelanea-browser

Install for current user (~/.local):
  ./install.sh

Requires: Debian/Ubuntu-style Linux with glibc, curl, WebKitGTK (libwebkit2gtk-4.1-0), GTK 3.
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
echo "  cd ${STAGING} && ./pixelanea-shell"
echo ""
echo "Install to ~/.local:"
echo "  ${STAGING}/install.sh"
