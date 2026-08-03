#!/usr/bin/env bash
# Shared staging and launcher generation for Linux desktop packages.
#
# Source from other scripts:
#   source "${ROOT_DIR}/scripts/stage-linux-desktop.sh"
#   stage_linux_desktop_assets "${TARGET_DIR}"
#   write_linux_desktop_launcher "${LAUNCHER_PATH}" system|self
#
# Or invoke directly:
#   ./scripts/stage-linux-desktop.sh stage <target_dir>
#   ./scripts/stage-linux-desktop.sh launcher <output_path> system|self
set -euo pipefail

_STAGE_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stage_linux_desktop_assets() {
  local target_dir="$1"
  mkdir -p "${target_dir}/web"
  install -m 755 "${_STAGE_ROOT_DIR}/server/build/pixelanea-server" "${target_dir}/pixelanea-server"
  (tar -C "${_STAGE_ROOT_DIR}/apps/web/dist" --exclude='.pixelanea-assets-hash' -cf - .) \
    | tar -C "${target_dir}/web" -xf -
  install -m 644 "${_STAGE_ROOT_DIR}/brand/logo-glyph.svg" "${target_dir}/logo-glyph.svg"
}

# install_dir_mode:
#   system — fixed /usr/share/pixelanea (.deb)
#   self   — directory containing the launcher script (portable / ~/.local)
write_linux_desktop_launcher() {
  local launcher_path="$1"
  local install_dir_mode="$2"

  local install_dir_line
  case "${install_dir_mode}" in
    system)
      install_dir_line='INSTALL_DIR="/usr/share/pixelanea"'
      ;;
    self)
      install_dir_line='INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"'
      ;;
    *)
      echo "write_linux_desktop_launcher: unknown mode '${install_dir_mode}' (use system or self)" >&2
      return 1
      ;;
  esac

  cat >"${launcher_path}" <<LAUNCHER
#!/usr/bin/env bash
set -euo pipefail
${install_dir_line}
HOST="127.0.0.1"
PORT="8787"
APP_URL="http://\${HOST}:\${PORT}"
BINARY="\${INSTALL_DIR}/pixelanea-server"
WEB_ROOT="\${INSTALL_DIR}/web"

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln "sport = :\${PORT}" 2>/dev/null | grep -q LISTEN
    return
  fi
  fuser "\${PORT}/tcp" >/dev/null 2>&1
}

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "\${APP_URL}" >/dev/null 2>&1 &
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "\${APP_URL}" >/dev/null 2>&1 &
  else
    echo "Pixelanea is running at \${APP_URL}"
  fi
}

warn_zenity_missing() {
  if command -v zenity >/dev/null 2>&1; then
    return 0
  fi
  echo ""
  echo "Note: zenity is not installed — native File Open/Save dialogs need it."
  echo "      Install with: sudo apt install zenity"
  echo "      Until then, use the path field in the app to open or save .pixelanea files."
  echo ""
}

handle_port_in_use() {
  if ! port_in_use; then
    return 0
  fi

  if command -v zenity >/dev/null 2>&1; then
    if zenity --question \\
        --title="Pixelanea" \\
        --text="Something is already using port \${PORT} (likely Pixelanea).\\n\\nOpen \${APP_URL} in your browser?" \\
        --ok-label="Open" \\
        --cancel-label="Cancel" 2>/dev/null; then
      open_browser
    fi
    exit 0
  fi

  echo ""
  echo "Port \${PORT} is already in use — Pixelanea may already be running."
  echo "  \${APP_URL}"
  echo ""
  if [[ -t 0 ]]; then
    read -r -p "Open in browser? [Y/n]: " answer
    case "\${answer}" in
      n|N|no|No) exit 0 ;;
      *) open_browser; exit 0 ;;
    esac
  else
    echo "Cannot prompt (no terminal). Open \${APP_URL} manually or close the other process."
    exit 1
  fi
}

warn_zenity_missing
handle_port_in_use

"\${BINARY}" --host "\${HOST}" --port "\${PORT}" --web-root "\${WEB_ROOT}" &
SERVER_PID=\$!

cleanup() {
  kill "\${SERVER_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if command -v curl >/dev/null 2>&1; then
  for _ in \$(seq 1 50); do
    if curl -sf "\${APP_URL}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
else
  sleep 2
fi

open_browser
wait "\${SERVER_PID}"
LAUNCHER

  chmod 755 "${launcher_path}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    stage)
      stage_linux_desktop_assets "${2:?usage: $0 stage <target_dir>}"
      ;;
    launcher)
      write_linux_desktop_launcher "${2:?usage: $0 launcher <output_path> <system|self>}" "${3:?usage: $0 launcher <output_path> <system|self>}"
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Usage: $0 stage <target_dir> | launcher <output_path> system|self" >&2
      exit 1
      ;;
  esac
fi
