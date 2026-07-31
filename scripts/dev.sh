#!/usr/bin/env bash
# Start Pixelanea backend (C++ API) and frontend (Vite) together.
#
# Usage:
#   ./scripts/dev.sh              # build backend, start API + Vite
#   ./scripts/dev.sh --build-only # compile server only
#   ./scripts/dev.sh --backend-only # API only (no Vite)
#   ./scripts/dev.sh --frontend-only # Vite only (API must already be running)
#   ./scripts/dev.sh --no-build     # skip cmake build (faster restart)
#   ./scripts/dev.sh --kill-stale   # stop processes on dev ports before start
#
# Environment:
#   API_PORT=8787   backend listen port (default 8787)
#   VITE_PORT=5173  Vite dev server port (default 5173)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/server/build"
BINARY="${BUILD_DIR}/pixelanea-server"
API_PORT="${API_PORT:-8787}"
VITE_PORT="${VITE_PORT:-5173}"
API_URL="http://127.0.0.1:${API_PORT}"
VITE_URL="http://127.0.0.1:${VITE_PORT}"

SERVER_PID=""
VITE_PID=""
SKIP_BUILD=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
BUILD_ONLY=false
KILL_STALE=false

for arg in "$@"; do
  case "${arg}" in
    --build-only) BUILD_ONLY=true ;;
    --backend-only) BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    --no-build) SKIP_BUILD=true ;;
    --kill-stale) KILL_STALE=true ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      echo "Run ./scripts/dev.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ -n "${VITE_PID}" ]] && kill -0 "${VITE_PID}" 2>/dev/null; then
    kill "${VITE_PID}" 2>/dev/null || true
    wait "${VITE_PID}" 2>/dev/null || true
  fi
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

  echo "==> Port ${port} (${label}) is in use — stopping stale listener..."
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

  echo "ERROR: Port ${port} still in use. Listener PIDs: $(port_listener_pids "${port}")" >&2
  echo "Stop them manually, e.g.: fuser -k ${port}/tcp" >&2
  exit 1
}

prepare_dev_ports() {
  if [[ "${FRONTEND_ONLY}" != true ]]; then
    free_port "${API_PORT}" "API"
  fi
  if [[ "${BACKEND_ONLY}" != true ]]; then
    free_port "${VITE_PORT}" "Vite"
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack enable 2>/dev/null || true
    corepack prepare pnpm@9.15.4 --activate 2>/dev/null || true
  fi
  command -v pnpm >/dev/null 2>&1
}

build_backend() {
  CMAKE_BIN="cmake"
  if ! command -v cmake >/dev/null 2>&1; then
    if [[ -x "${ROOT_DIR}/.venv-build/bin/cmake" ]]; then
      CMAKE_BIN="${ROOT_DIR}/.venv-build/bin/cmake"
    else
      echo "cmake not found. Install cmake or create ${ROOT_DIR}/.venv-build with:"
      echo "  python3 -m venv .venv-build && .venv-build/bin/pip install cmake ninja"
      exit 1
    fi
  fi

  CMAKE_ARGS=(
    -S "${ROOT_DIR}/server"
    -B "${BUILD_DIR}"
    -DCMAKE_BUILD_TYPE=Debug
    -DCMAKE_CXX_COMPILER="${CXX:-g++}"
    -DCMAKE_C_COMPILER="${CC:-gcc}"
  )

  if [[ ! -f "${BUILD_DIR}/CMakeCache.txt" ]]; then
    if command -v ninja >/dev/null 2>&1; then
      CMAKE_ARGS+=("-G" "Ninja")
    else
      CMAKE_ARGS+=("-G" "Unix Makefiles")
    fi
  fi

  if [[ -n "${VCPKG_ROOT:-}" && -f "${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" ]]; then
    CMAKE_ARGS+=("-DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
  fi

  echo "==> Building backend..."
  "${CMAKE_BIN}" "${CMAKE_ARGS[@]}"
  "${CMAKE_BIN}" --build "${BUILD_DIR}"
}

wait_for_api() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl not found; waiting 2s for API startup..."
    sleep 2
    return 0
  fi

  echo "==> Waiting for API at ${API_URL}/api/health ..."
  for _ in $(seq 1 50); do
    if curl -sf "${API_URL}/api/health" >/dev/null 2>&1; then
      echo "==> API is healthy"
      return 0
    fi
    sleep 0.2
  done

  echo "ERROR: API did not become healthy at ${API_URL}" >&2
  echo "Check server logs above or run: ${BINARY}" >&2
  exit 1
}

start_backend() {
  echo "==> Starting backend on ${API_URL}"
  "${BINARY}" &
  SERVER_PID=$!
  wait_for_api
}

start_frontend() {
  if ! ensure_pnpm; then
    echo "pnpm not found. Install with:"
    echo "  corepack enable && corepack prepare pnpm@9.15.4 --activate"
    exit 1
  fi

  if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
    echo "==> Installing frontend dependencies..."
    (cd "${ROOT_DIR}" && pnpm install)
  fi

  echo "==> Starting Vite on ${VITE_URL} (proxies /api → ${API_URL})"
  cd "${ROOT_DIR}"
  pnpm --filter @pixelanea/web exec vite --port "${VITE_PORT}" --strictPort &
  VITE_PID=$!

  for _ in $(seq 1 30); do
    if ! kill -0 "${VITE_PID}" 2>/dev/null; then
      echo "ERROR: Vite failed to start on port ${VITE_PORT}." >&2
      echo "Try: ./scripts/dev.sh --kill-stale   or   fuser -k ${VITE_PORT}/tcp" >&2
      exit 1
    fi
    if curl -sf "${VITE_URL}/" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  echo ""
  echo "Pixelanea dev stack running:"
  echo "  Frontend:  ${VITE_URL}"
  echo "  API:       ${API_URL}"
  echo "  Health:    ${API_URL}/api/health"
  echo ""
  echo "Press Ctrl+C to stop both servers."
  echo ""

  wait "${VITE_PID}"
}

# --- main ---

if [[ "${FRONTEND_ONLY}" == true && "${BACKEND_ONLY}" == true ]]; then
  echo "Cannot use --backend-only and --frontend-only together." >&2
  exit 1
fi

if [[ "${FRONTEND_ONLY}" != true && "${SKIP_BUILD}" != true ]]; then
  build_backend
fi

if [[ "${BUILD_ONLY}" == true ]]; then
  echo "==> Build complete (--build-only)."
  exit 0
fi

if [[ "${KILL_STALE}" == true ]]; then
  prepare_dev_ports
else
  if [[ "${FRONTEND_ONLY}" != true ]] && port_in_use "${API_PORT}"; then
    echo "==> API port ${API_PORT} busy — freeing stale listener..."
    free_port "${API_PORT}" "API"
  fi
  if [[ "${BACKEND_ONLY}" != true ]] && port_in_use "${VITE_PORT}"; then
    echo "==> Vite port ${VITE_PORT} busy — freeing stale listener..."
    free_port "${VITE_PORT}" "Vite"
  fi
fi

if [[ "${FRONTEND_ONLY}" != true ]]; then
  start_backend
fi

if [[ "${BACKEND_ONLY}" == true ]]; then
  echo "==> Backend running on ${API_URL} (PID ${SERVER_PID})"
  wait "${SERVER_PID}"
  exit 0
fi

start_frontend
