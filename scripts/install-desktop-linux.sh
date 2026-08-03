#!/usr/bin/env bash
# Install Pixelanea desktop launcher for the current user (no root required).
#
# Usage:
#   ./scripts/install-desktop-linux.sh
#   ./scripts/install-desktop-linux.sh --prefix ~/.local/share/pixelanea
#
# Creates:
#   ~/.local/share/pixelanea/          app files (server binary + web bundle)
#   ~/.local/bin/pixelanea             launcher script
#   ~/.local/share/applications/pixelanea.desktop
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=stage-linux-desktop.sh
source "${ROOT_DIR}/scripts/stage-linux-desktop.sh"

INSTALL_PREFIX="${HOME}/.local/share/pixelanea"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      INSTALL_PREFIX="${2:?--prefix requires a path}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

"${ROOT_DIR}/scripts/build-desktop.sh"

mkdir -p "${INSTALL_PREFIX}" "${BIN_DIR}" "${DESKTOP_DIR}"

stage_linux_desktop_assets "${INSTALL_PREFIX}"

LAUNCHER="${INSTALL_PREFIX}/pixelanea-launch.sh"
write_linux_desktop_launcher "${LAUNCHER}" self

ln -sf "${LAUNCHER}" "${BIN_DIR}/pixelanea"

cat >"${DESKTOP_DIR}/pixelanea.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Pixelanea
GenericName=Pixel Art Editor
Comment=Make pixel art. Keep it local.
Exec=${LAUNCHER}
Icon=${INSTALL_PREFIX}/logo-glyph.svg
Terminal=false
Categories=Graphics;2DGraphics;
Keywords=pixel;art;editor;animation;
StartupNotify=true
EOF
chmod 644 "${DESKTOP_DIR}/pixelanea.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true
fi

echo ""
echo "Pixelanea installed for current user:"
echo "  App dir:   ${INSTALL_PREFIX}"
echo "  Launcher:  ${BIN_DIR}/pixelanea"
echo "  Menu:      ${DESKTOP_DIR}/pixelanea.desktop"
echo ""
echo "Start from your app menu, or run: pixelanea"
echo "Then open: http://127.0.0.1:8787"
