#!/usr/bin/env bash
# Backend smoke tests — mirrors .cursor/skill-outputs/.../pixelanea-cpp-standards/test.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

PASS=0
FAIL=0
SERVER_PID=""

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  fuser -k 8787/tcp 2>/dev/null || true
}
trap cleanup EXIT INT TERM

CMAKE="cmake"
CTEST="ctest"
if ! command -v cmake >/dev/null 2>&1; then
  CMAKE="${ROOT_DIR}/.venv-build/bin/cmake"
  CTEST="${ROOT_DIR}/.venv-build/bin/ctest"
fi

echo "=== Backend test suite ==="

# 1–2: build
if "${CMAKE}" -S server -B server/build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_COMPILER="${CXX:-g++}" \
  -DCMAKE_C_COMPILER="${CC:-gcc}" \
  -G "Unix Makefiles" >/dev/null 2>&1 \
  && "${CMAKE}" --build server/build >/dev/null 2>&1; then
  pass "cmake build"
else
  fail "cmake build"
fi

if [[ -x server/build/pixelanea-server ]]; then
  pass "binary exists"
else
  fail "binary exists"
fi

if "${CTEST}" --test-dir server/build --output-on-failure >/dev/null 2>&1; then
  pass "ctest unit tests"
else
  fail "ctest unit tests"
fi

if ./scripts/dev.sh --build-only >/dev/null 2>&1; then
  pass "dev.sh --build-only"
else
  fail "dev.sh --build-only"
fi

# 12: migration file
if [[ -f server/db/migrations/001_initial.sql ]] \
  && grep -q 'CREATE TABLE IF NOT EXISTS projects' server/db/migrations/001_initial.sql; then
  pass "migration 001_initial.sql"
else
  fail "migration 001_initial.sql"
fi

# 3: start server
./server/build/pixelanea-server >/tmp/pixelanea-test-server.log 2>&1 &
SERVER_PID=$!
sleep 1

if curl -sf http://127.0.0.1:8787/api/health >/dev/null 2>&1; then
  pass "server started"
else
  fail "server started"
  echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
  exit 1
fi

# Manual: localhost bind
if command -v ss >/dev/null 2>&1; then
  if ss -tln | grep -q '127.0.0.1:8787'; then
    pass "binds 127.0.0.1 only"
  else
    fail "binds 127.0.0.1 only (ss check)"
  fi
fi

# 4: health
HEALTH=$(curl -sf http://127.0.0.1:8787/api/health || true)
if echo "${HEALTH}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok' and d['version']=='1.0.0'"; then
  pass "GET /api/health"
else
  fail "GET /api/health (got: ${HEALTH})"
fi

# 5–10: project lifecycle
PROJECT=$(curl -sf -X POST http://127.0.0.1:8787/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Sprite","width":16,"height":16,"frameCount":1}' || true)

if echo "${PROJECT}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['name']=='Test Sprite' and d['width']==16"; then
  pass "POST /api/projects"
else
  fail "POST /api/projects"
fi

PROJECT_ID=$(echo "${PROJECT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

if [[ -n "${PROJECT_ID}" ]] && [[ -f "/tmp/pixelanea-projects/${PROJECT_ID}.db" ]]; then
  pass "temp SQLite file created"
else
  fail "temp SQLite file created"
fi

META=$(curl -sf "http://127.0.0.1:8787/api/projects/${PROJECT_ID}" || true)
if echo "${META}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['name']=='Test Sprite'"; then
  pass "GET /api/projects/{id}"
else
  fail "GET /api/projects/{id}"
fi

FRAMES=$(curl -sf "http://127.0.0.1:8787/api/projects/${PROJECT_ID}/frames" || true)
if echo "${FRAMES}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['frames'])==1 and d['frames'][0]['index']==0"; then
  pass "GET /api/projects/{id}/frames"
else
  fail "GET /api/projects/{id}/frames"
fi

if curl -sf "http://127.0.0.1:8787/api/projects/${PROJECT_ID}/frames/0" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['pixels'])==256 and all(p==0 for p in d['pixels'])"; then
  pass "GET /api/projects/{id}/frames/0"
else
  fail "GET /api/projects/{id}/frames/0"
fi

PUT_STATUS=$(python3 - <<EOF
import json, urllib.request, sys
pixels = [1] + [0] * 255
body = json.dumps({"pixels": pixels}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8787/api/projects/${PROJECT_ID}/frames/0",
    data=body, method="PUT",
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as r:
    print(r.status)
EOF
)
if [[ "${PUT_STATUS}" == "200" ]] \
  && curl -sf "http://127.0.0.1:8787/api/projects/${PROJECT_ID}/frames/0" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['pixels'][0]==1"; then
  pass "PUT /api/projects/{id}/frames/0 round-trip"
else
  fail "PUT /api/projects/{id}/frames/0 round-trip"
fi

PIXELATE_PNG_B64=$(python3 - <<'PY'
import base64, struct, zlib

def png_chunk(tag, data):
    crc = zlib.crc32(tag + data) & 0xffffffff
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

width, height = 2, 2
raw = b''.join([
    b'\x00' + bytes([255, 0, 0, 255, 0, 255, 0, 255]),
    b'\x00' + bytes([0, 0, 255, 255, 255, 255, 0, 255]),
])
compressed = zlib.compress(raw, 9)
ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
png = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', ihdr) + png_chunk(b'IDAT', compressed) + png_chunk(b'IEND', b'')
print(base64.b64encode(png).decode())
PY
)

PIXELATE=$(curl -sf -X POST "http://127.0.0.1:8787/api/projects/${PROJECT_ID}/import/pixelate" \
  -H 'Content-Type: application/json' \
  -d "{\"imageData\":\"${PIXELATE_PNG_B64}\",\"targetWidth\":2,\"targetHeight\":2,\"maxColors\":4}" || true)

if echo "${PIXELATE}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['width']==2 and len(d['pixels'])==4"; then
  pass "POST /api/projects/{id}/import/pixelate"
else
  fail "POST /api/projects/{id}/import/pixelate (got: ${PIXELATE})"
fi

DELETE_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X DELETE "http://127.0.0.1:8787/api/projects/${PROJECT_ID}")
if [[ "${DELETE_CODE}" == "204" ]]; then
  pass "DELETE /api/projects/{id}"
else
  fail "DELETE /api/projects/{id} (code ${DELETE_CODE})"
fi

# 11: negative
NOTFOUND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8787/api/projects/00000000-0000-4000-8000-000000000000")
if [[ "${NOTFOUND_CODE}" == "404" ]]; then
  pass "404 unknown project"
else
  fail "404 unknown project (code ${NOTFOUND_CODE})"
fi

echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
