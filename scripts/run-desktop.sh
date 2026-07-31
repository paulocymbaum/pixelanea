#!/usr/bin/env bash
# Run Pixelanea in desktop mode: single local server + browser window.
#
# Usage:
#   ./scripts/run-desktop.sh              # build if needed, start, open browser
#   ./scripts/run-desktop.sh --no-build     # skip build step
#   ./scripts/run-desktop.sh --no-open      # start server only (no browser)
#   ./scripts/run-desktop.sh --kill-stale   # free listen port before start
#
# Environment:
#   PIXELANEA_PORT=8787   listen port (default 8787)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/server/build"
BINARY="${BUILD_DIR}/pixelanea-server"
WEB_DIST="${ROOT_DIR}/apps/web/dist"
HOST="${PIXELANEA_HOST:-127.0.0.1}"
PORT="${PIXELANEA_PORT:-8787}"
APP_URL="http://${HOST}:${PORT}"

SERVER_PID=""
SKIP_BUILD=false
OPEN_BROWSER=true
KILL_STALE=false

for arg in "$@"; do
  case "${arg}" in
    --no-build) SKIP_BUILD=true ;;
    --no-open) OPEN_BROWSER=false ;;
    --kill-stale) KILL_STALE=true ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      echo "Run ./scripts/run-desktop.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tln "sport = :${port}" 2>/dev/null | grep -q LISTEN
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    [[ -n "$(lsof -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null)" ]]
    return
  fi
  fuser "${port}/tcp" >/dev/null 2>&1
}

free_port() {
  local port="$1"
  if ! port_in_use "${port}"; then
    return 0
  fi

  echo "==> Port ${port} is in use — stopping stale listener..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi

  for _ in $(seq 1 20); do
    if ! port_in_use "${port}"; then
      return 0
    fi
    sleep 0.1
  done

  echo "ERROR: Port ${port} still in use." >&2
  exit 1
}

wait_for_api() {
  if ! command -v curl >/dev/null 2>&1; then
    sleep 2
    return 0
  fi

  echo "==> Waiting for Pixelanea at ${APP_URL}/api/health ..."
  for _ in $(seq 1 50); do
    if curl -sf "${APP_URL}/api/health" >/dev/null 2>&1; then
      echo "==> Pixelanea is ready"
      return 0
    fi
    sleep 0.2
  done

  echo "ERROR: Pixelanea did not become healthy at ${APP_URL}" >&2
  exit 1
}

open_browser() {
  if [[ "${OPEN_BROWSER}" != true ]]; then
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${APP_URL}" >/dev/null 2>&1 &
    return 0
  fi
  if command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "${APP_URL}" >/dev/null 2>&1 &
    return 0
  fi

  echo "Open ${APP_URL} in your browser."
}

if [[ "${SKIP_BUILD}" != true ]]; then
  if [[ ! -x "${BINARY}" || ! -f "${WEB_DIST}/index.html" ]]; then
    "${ROOT_DIR}/scripts/build-desktop.sh"
  fi
fi

if [[ ! -x "${BINARY}" ]]; then
  echo "ERROR: server binary not found at ${BINARY}" >&2
  echo "Run: ./scripts/build-desktop.sh" >&2
  exit 1
fi

if [[ ! -f "${WEB_DIST}/index.html" ]]; then
  echo "ERROR: frontend bundle not found at ${WEB_DIST}" >&2
  echo "Run: ./scripts/build-desktop.sh" >&2
  exit 1
fi

if [[ "${KILL_STALE}" == true ]]; then
  free_port "${PORT}"
elif port_in_use "${PORT}"; then
  echo "==> Port ${PORT} busy — freeing stale listener..."
  free_port "${PORT}"
fi

echo "==> Starting Pixelanea desktop mode on ${APP_URL}"
"${BINARY}" --host "${HOST}" --port "${PORT}" --web-root "${WEB_DIST}" &
SERVER_PID=$!

wait_for_api
open_browser

echo ""
echo "Pixelanea is running:"
echo "  URL:    ${APP_URL}"
echo "  Health: ${APP_URL}/api/health"
echo ""
echo "Press Ctrl+C to stop."
echo ""

wait "${SERVER_PID}"
