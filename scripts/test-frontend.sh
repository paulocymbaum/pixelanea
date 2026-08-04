#!/usr/bin/env bash
# Frontend smoke tests — mirrors .cursor/skill-outputs/.../pixelanea-frontend-standards/test.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

PASS=0
FAIL=0
SERVER_PID=""
VITE_PID=""

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  if [[ -n "${VITE_PID}" ]] && kill -0 "${VITE_PID}" 2>/dev/null; then
    kill "${VITE_PID}" 2>/dev/null || true
    wait "${VITE_PID}" 2>/dev/null || true
  fi
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  fuser -k 5173/tcp 2>/dev/null || true
  fuser -k 8787/tcp 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "=== Frontend test suite ==="

if ! command -v pnpm >/dev/null 2>&1; then
  echo "FAIL: pnpm not found"
  exit 1
fi

# 1: install (cache-aware)
if ./scripts/deps-cache.sh install >/dev/null 2>&1; then
  pass "pnpm install"
else
  fail "pnpm install"
fi

# 2: codegen (cache-aware)
if ./scripts/assets-cache.sh ensure-api >/dev/null 2>&1 \
  && [[ -f packages/api-client/src/generated/schema.ts ]]; then
  pass "pnpm generate:api"
else
  fail "pnpm generate:api"
fi

# 3: build (cache-aware; vite only — tsc is not required for smoke tests)
if ./scripts/assets-cache.sh ensure-web >/dev/null 2>&1 \
  && [[ -f apps/web/dist/index.html ]]; then
  pass "pnpm build"
else
  fail "pnpm build"
fi

# 4: lint
if pnpm lint >/dev/null 2>&1; then
  pass "pnpm lint"
else
  fail "pnpm lint"
fi

# 4b: vitest
if pnpm --filter @pixelanea/web test >/dev/null 2>&1; then
  pass "vitest unit tests"
else
  fail "vitest unit tests"
fi

# 5: api-client build
if pnpm --filter @pixelanea/api-client build >/dev/null 2>&1 \
  && [[ -f packages/api-client/dist/client.js ]]; then
  pass "api-client build"
else
  fail "api-client build"
fi

# 8: dev.sh build-only
if ./scripts/dev.sh --build-only >/dev/null 2>&1; then
  pass "dev.sh --build-only"
else
  fail "dev.sh --build-only"
fi

# 9: layer structure
STRUCTURE_OK=true
for dir in pages shell components/ui components/palette canvas tools state content api styles; do
  if [[ ! -d "apps/web/src/${dir}" ]]; then
    STRUCTURE_OK=false
    break
  fi
done
if ${STRUCTURE_OK}; then
  pass "layer directories"
else
  fail "layer directories"
fi

# 10: entry points
if [[ -f apps/web/src/pages/EditorPage.tsx ]] \
  && [[ -f apps/web/src/api/health.ts ]] \
  && [[ -f apps/web/src/shell/EditorLayout.tsx ]] \
  && [[ -f packages/api-client/src/client.ts ]]; then
  pass "entry point files"
else
  fail "entry point files"
fi

# Static manual-check proxies (source inspection)
if grep -q 'role="status"' apps/web/src/shell/StatusBar.tsx; then
  pass "StatusBar role=status (static)"
else
  fail "StatusBar role=status (static)"
fi

if grep -q 'frameCount <= 1' apps/web/src/shell/BottomFrameStrip.tsx; then
  pass "frame strip progressive disclosure (static)"
else
  fail "frame strip progressive disclosure (static)"
fi

# Design system integration (static)
if [[ -f brand/colors.css ]] \
  && grep -q 'brand/colors.css' apps/web/src/styles/tokens.css; then
  pass "brand palette → tokens pipeline (static)"
else
  fail "brand palette → tokens pipeline (static)"
fi

if grep -q 'toolButtonVariants' apps/web/src/shell/LeftToolRail.tsx; then
  pass "LeftToolRail uses toolButtonVariants (static)"
else
  fail "LeftToolRail uses toolButtonVariants (static)"
fi

if grep -q 'transition-panel' apps/web/src/shell/RightPalettePanel.tsx; then
  pass "RightPalettePanel transition-panel (static)"
else
  fail "RightPalettePanel transition-panel (static)"
fi

if ! grep -rq 'editorStore\|uiStore' apps/web/src/components/ui/; then
  pass "ui layer has no store imports (static)"
else
  fail "ui layer has no store imports (static)"
fi

if grep -q 'TooltipProvider' apps/web/src/pages/EditorPage.tsx; then
  pass "TooltipProvider mounted in EditorPage (static)"
else
  fail "TooltipProvider mounted in EditorPage (static)"
fi

if cmp -s brand/logo-glyph.svg apps/web/public/logo-glyph.svg; then
  pass "logo glyph synced brand → public (static)"
else
  fail "logo glyph synced brand → public (static)"
fi

for asset in logo-mark.svg logo-lockup.svg logo-wordmark.svg app-icon.svg; do
  if [[ -f "brand/${asset}" && -f "apps/web/public/${asset}" ]] \
    && cmp -s "brand/${asset}" "apps/web/public/${asset}"; then
    pass "${asset} synced brand → public (static)"
  else
    fail "${asset} synced brand → public (static)"
  fi
done

for png in \
  apps/web/public/favicon/favicon.svg \
  apps/web/public/favicon/favicon-16x16.png \
  apps/web/public/favicon/favicon-32x32.png \
  apps/web/public/favicon/apple-touch-icon.png \
  apps/web/public/icons/icon-192.png \
  apps/web/public/icons/icon-512.png; do
  if [[ -f "${png}" ]]; then
    pass "$(basename "$(dirname "${png}")")/$(basename "${png}") present (static)"
  else
    fail "$(basename "$(dirname "${png}")")/$(basename "${png}") present (static)"
  fi
done

if [[ -f packaging/linux/icons/hicolor/48x48/mimetypes/application-x-pixelanea.png \
  && -f packaging/linux/icons/hicolor/48x48/apps/pixelanea.png ]]; then
  pass "linux hicolor icons present (static)"
else
  fail "linux hicolor icons present (static)"
fi

if grep -q 'favicon/favicon.svg' apps/web/index.html \
  && grep -q 'apple-touch-icon' apps/web/index.html; then
  pass "index.html favicon links (static)"
else
  fail "index.html favicon links (static)"
fi

DESIGN_TEST_OK=true
for f in \
  apps/web/src/components/ui/Button.test.tsx \
  apps/web/src/components/ui/DropdownMenu.test.tsx \
  apps/web/src/components/ui/Dialog.test.tsx \
  apps/web/src/components/ui/Slider.test.tsx \
  apps/web/src/components/ui/tool-button.test.ts \
  apps/web/src/shell/AppHeader.test.tsx \
  apps/web/src/shell/LeftToolRail.test.tsx \
  apps/web/src/pages/EditorPage.test.tsx; do
  if [[ ! -f "${f}" ]]; then
    DESIGN_TEST_OK=false
    break
  fi
done
if ${DESIGN_TEST_OK}; then
  pass "design system vitest files present (static)"
else
  fail "design system vitest files present (static)"
fi

if grep -q 'persist' apps/web/src/state/sessionStore.ts \
  && grep -q 'pixelanea-session' apps/web/src/state/sessionStore.ts; then
  pass "theme persist localStorage (static)"
else
  fail "theme persist localStorage (static)"
fi

if grep -q 'checkHealth' apps/web/src/App.tsx; then
  pass "App health check hook (static)"
else
  fail "App health check hook (static)"
fi

# 6–7: backend + proxy (needs running services)
./server/build/pixelanea-server >/tmp/pixelanea-test-server.log 2>&1 &
SERVER_PID=$!
sleep 1

if curl -sf http://127.0.0.1:8787/api/health \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok'"; then
  pass "backend health prerequisite"
else
  fail "backend health prerequisite"
fi

pnpm --filter @pixelanea/web dev >/tmp/pixelanea-test-vite.log 2>&1 &
VITE_PID=$!
sleep 4

PROXY_HEALTH=$(curl -sf http://localhost:5173/api/health || true)
if echo "${PROXY_HEALTH}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok'"; then
  pass "Vite /api proxy"
else
  fail "Vite /api proxy (got: ${PROXY_HEALTH})"
fi

echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
