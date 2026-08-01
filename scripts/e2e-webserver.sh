#!/usr/bin/env bash
# Start API + Vite for Playwright E2E. Playwright manages process lifecycle.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

API_PORT="${API_PORT:-8787}"
VITE_PORT="${VITE_PORT:-5173}"
BINARY="${ROOT_DIR}/server/build/pixelanea-server"

if [[ ! -x "${BINARY}" ]]; then
  echo "==> Building backend for E2E..."
  ./scripts/dev.sh --build-only
fi

free_port() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
}

free_port "${API_PORT}"
free_port "${VITE_PORT}"

echo "==> Starting API on :${API_PORT}"
"${BINARY}" &
SERVER_PID=$!

for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
  echo "ERROR: API failed to start" >&2
  exit 1
fi

echo "==> Starting Vite on :${VITE_PORT}"
pnpm --filter @pixelanea/web exec vite --port "${VITE_PORT}" --strictPort &
VITE_PID=$!

for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -sf "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
  echo "ERROR: Vite failed to start" >&2
  exit 1
fi

echo "==> E2E stack ready (API ${API_PORT}, Vite ${VITE_PORT})"

cleanup() {
  kill "${VITE_PID}" 2>/dev/null || true
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${VITE_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait "${VITE_PID}"
