#!/usr/bin/env bash
# Start API + Vite for Playwright E2E. Playwright manages process lifecycle.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

API_PORT="${API_PORT:-8787}"
VITE_PORT="${VITE_PORT:-5173}"
VITE_HOST="${VITE_HOST:-127.0.0.1}"
BINARY="${ROOT_DIR}/server/build/pixelanea-server"
VITE_LOG="${ROOT_DIR}/.cache/e2e-vite.log"
WEB_DIST="${ROOT_DIR}/apps/web/dist/index.html"

mkdir -p "${ROOT_DIR}/.cache"

if [[ ! -x "${BINARY}" ]]; then
  echo "==> Building backend for E2E..."
  ./scripts/dev.sh --build-only
fi

if [[ "${CI:-}" == "true" && ! -f "${WEB_DIST}" ]]; then
  echo "==> CI E2E: building web dist (missing ${WEB_DIST})"
  ./scripts/assets-cache.sh ensure-web
fi

free_port() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-120}"
  local delay="${4:-0.5}"
  for _ in $(seq 1 "${attempts}"); do
    if curl -sf "${url}" >/dev/null 2>&1; then
      echo "==> ${label} ready (${url})"
      return 0
    fi
    sleep "${delay}"
  done
  echo "ERROR: ${label} failed to become ready (${url})" >&2
  return 1
}

free_port "${API_PORT}"
free_port "${VITE_PORT}"

echo "==> Starting API on :${API_PORT}"
"${BINARY}" &
SERVER_PID=$!

if ! wait_for_url "http://127.0.0.1:${API_PORT}/api/health" "API" 60 0.5; then
  echo "ERROR: API failed to start" >&2
  exit 1
fi

: > "${VITE_LOG}"
if [[ "${CI:-}" == "true" && -f "${WEB_DIST}" ]]; then
  echo "==> Starting Vite preview on ${VITE_HOST}:${VITE_PORT} (prebuilt dist)"
  pnpm --filter @pixelanea/web exec vite preview \
    --host "${VITE_HOST}" \
    --port "${VITE_PORT}" \
    --strictPort >>"${VITE_LOG}" 2>&1 &
else
  echo "==> Starting Vite dev server on ${VITE_HOST}:${VITE_PORT}"
  pnpm --filter @pixelanea/web exec vite \
    --host "${VITE_HOST}" \
    --port "${VITE_PORT}" \
    --strictPort >>"${VITE_LOG}" 2>&1 &
fi
VITE_PID=$!

if ! wait_for_url "http://${VITE_HOST}:${VITE_PORT}/" "Vite" 180 0.5; then
  echo "ERROR: Vite failed to start — log tail:" >&2
  tail -n 40 "${VITE_LOG}" >&2 || true
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
