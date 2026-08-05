#!/usr/bin/env bash
# Free dev/E2E ports before local CI so Playwright can start its web server.
set -euo pipefail

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

port_listener_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp "sport = :${port}" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true
    return
  fi
  fuser "${port}/tcp" 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) print $i}' || true
}

free_port() {
  local port="$1"
  local label="$2"
  if ! port_in_use "${port}"; then
    return 0
  fi

  echo "==> Freeing port ${port} (${label}) for CI..."
  local pid
  for pid in $(port_listener_pids "${port}"); do
    kill "${pid}" 2>/dev/null || true
  done
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi

  for _ in $(seq 1 20); do
    if ! port_in_use "${port}"; then
      return 0
    fi
    sleep 0.1
  done

  echo "ERROR: Port ${port} still in use. Stop ./scripts/dev.sh first." >&2
  exit 1
}

free_port "${VITE_PORT:-5173}" "Vite"
free_port "${API_PORT:-8787}" "API"
