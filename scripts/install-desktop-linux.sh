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
INSTALL_PREFIX="${HOME}/.local/share/pixelanea"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_PATH="${ROOT_DIR}/brand/logo-glyph.svg"

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

install -m 755 "${ROOT_DIR}/server/build/pixelanea-server" "${INSTALL_PREFIX}/pixelanea-server"
rm -rf "${INSTALL_PREFIX}/web"
cp -a "${ROOT_DIR}/apps/web/dist" "${INSTALL_PREFIX}/web"
install -m 644 "${ICON_PATH}" "${INSTALL_PREFIX}/logo-glyph.svg"

LAUNCHER="${INSTALL_PREFIX}/pixelanea-launch.sh"
cat >"${LAUNCHER}" <<'EOF'
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
fi

wait "${SERVER_PID}"
EOF
chmod 755 "${LAUNCHER}"

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
