#!/usr/bin/env bash
# Build example .pixelanea bundles under examples/projects/.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

API_PORT="${API_PORT:-8787}"
API_URL="http://127.0.0.1:${API_PORT}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! curl -sf "${API_URL}/api/health" >/dev/null 2>&1; then
  if [[ ! -x server/build/pixelanea-server ]]; then
    echo "==> Building backend..."
    ./scripts/dev.sh --build-only
  fi
  echo "==> Starting pixelanea-server on ${API_URL}..."
  ./server/build/pixelanea-server >/tmp/pixelanea-example-projects-server.log 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 20); do
    if curl -sf "${API_URL}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
  if ! curl -sf "${API_URL}/api/health" >/dev/null 2>&1; then
    echo "error: server failed to start (see /tmp/pixelanea-example-projects-server.log)" >&2
    exit 1
  fi
fi

PIXELANEA_API_URL="${API_URL}" python3 scripts/create-example-projects.py
