#!/usr/bin/env bash
# Smoke test the native desktop shell: start, wait for /api/health, clean exit.
#
# Usage:
#   ./scripts/test-desktop-shell.sh
#   ./scripts/test-desktop-shell.sh --skip-build   # reuse existing binaries
#
# Uses xvfb-run when DISPLAY is unset (CI/headless). Falls back to server-only
# smoke when neither DISPLAY nor xvfb-run is available.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_DIR="${ROOT_DIR}/apps/desktop/src-tauri"
SHELL_BINARY="${TAURI_DIR}/target/release/pixelanea-shell"
SERVER_BINARY="${ROOT_DIR}/server/build/pixelanea-server"
WEB_DIST="${ROOT_DIR}/apps/web/dist"

HOST="${PIXELANEA_HOST:-127.0.0.1}"
PORT="${PIXELANEA_PORT:-18787}"
APP_URL="http://${HOST}:${PORT}"

SKIP_BUILD=false
for arg in "$@"; do
  case "${arg}" in
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      exit 1
      ;;
  esac
done

if [[ "${SKIP_BUILD}" != true ]]; then
  if [[ ! -x "${SERVER_BINARY}" || ! -f "${WEB_DIST}/index.html" ]]; then
    "${ROOT_DIR}/scripts/build-desktop.sh"
  fi
  if [[ ! -x "${SHELL_BINARY}" ]]; then
    "${ROOT_DIR}/scripts/build-desktop-shell.sh"
  fi
fi

if [[ ! -x "${SHELL_BINARY}" ]]; then
  echo "ERROR: pixelanea-shell not found at ${SHELL_BINARY}" >&2
  exit 1
fi

export PIXELANEA_ROOT="${ROOT_DIR}"
export PIXELANEA_HOST="${HOST}"
export PIXELANEA_PORT="${PORT}"

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

if port_in_use; then
  echo "ERROR: port ${PORT} already in use — set PIXELANEA_PORT to a free port" >&2
  exit 1
fi

wait_for_health() {
  if ! command -v curl >/dev/null 2>&1; then
    sleep 3
    return 0
  fi
  for _ in $(seq 1 75); do
    if curl -sf "${APP_URL}/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  echo "ERROR: ${APP_URL}/api/health did not become ready" >&2
  return 1
}

server_only_smoke() {
  echo "==> Server-only smoke (no DISPLAY / xvfb-run)"
  "${SERVER_BINARY}" --host "${HOST}" --port "${PORT}" --web-root "${WEB_DIST}" &
  local pid=$!
  trap 'kill "${pid}" 2>/dev/null || true' EXIT INT TERM
  wait_for_health
  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
  trap - EXIT INT TERM
}

shell_pid=""
cleanup() {
  if [[ -n "${shell_pid}" ]] && kill -0 "${shell_pid}" 2>/dev/null; then
    kill "${shell_pid}" 2>/dev/null || true
    wait "${shell_pid}" 2>/dev/null || true
  fi
  if port_in_use; then
    if command -v fuser >/dev/null 2>&1; then
      fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup EXIT INT TERM

run_shell_smoke() {
  echo "==> Desktop shell smoke on ${APP_URL}"

  if [[ -n "${DISPLAY:-}" ]]; then
    "${SHELL_BINARY}" &
    shell_pid=$!
  elif command -v xvfb-run >/dev/null 2>&1; then
    xvfb-run -a "${SHELL_BINARY}" &
    shell_pid=$!
  else
    server_only_smoke
    echo "==> Desktop shell smoke passed (server-only fallback)"
    return 0
  fi

  if ! wait_for_health; then
    echo "ERROR: shell started but API health check failed" >&2
    exit 1
  fi

  kill "${shell_pid}" 2>/dev/null || true
  wait "${shell_pid}" 2>/dev/null || true
  shell_pid=""

  sleep 0.5
  if port_in_use; then
    echo "ERROR: server still listening on ${PORT} after shell exit (orphan process?)" >&2
    exit 1
  fi

  echo "==> Desktop shell smoke passed"
}

run_shell_smoke
