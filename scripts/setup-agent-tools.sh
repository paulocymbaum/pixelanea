#!/usr/bin/env bash
# Install graphify, caveman, and RTK for Cursor agent workflows in this repo.
#
# What gets configured:
#   graphify  — .venv-graphify + .cursor/rules/graphify.mdc + graphify-out/ (code-only graph)
#   caveman   — .cursor/rules/caveman.mdc + .cursor/skills/caveman/SKILL.md
#   rtk       — ~/.cursor/hooks.json preToolUse hook (global; Cursor has no project scope)
#
# Usage:
#   ./scripts/setup-agent-tools.sh
#   ./scripts/setup-agent-tools.sh --skip-rtk        # skip RTK binary + global hook
#   ./scripts/setup-agent-tools.sh --skip-graphify   # skip venv + graph build
#   ./scripts/setup-agent-tools.sh --skip-caveman    # skip caveman rule/skill
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv-graphify"
GRAPHIFY_BIN="${VENV_DIR}/bin/graphify"
RTK_INSTALL_URL="https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh"
CAVEMAN_RULE_URL="https://raw.githubusercontent.com/JuliusBrussee/caveman/main/src/rules/caveman-activate.md"
CAVEMAN_SKILL_URL="https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman/SKILL.md"

SKIP_GRAPHIFY=false
SKIP_CAVEMAN=false
SKIP_RTK=false

for arg in "$@"; do
  case "${arg}" in
    --skip-graphify) SKIP_GRAPHIFY=true ;;
    --skip-caveman) SKIP_CAVEMAN=true ;;
    --skip-rtk) SKIP_RTK=true ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "setup-agent-tools: unknown flag: ${arg}" >&2
      exit 1
      ;;
  esac
done

install_graphify() {
  if [[ ! -d "${VENV_DIR}" ]]; then
    echo "setup-agent-tools: creating ${VENV_DIR}..."
    python3 -m venv "${VENV_DIR}"
  fi

  echo "setup-agent-tools: installing graphifyy into venv..."
  "${VENV_DIR}/bin/pip" install -q -r "${ROOT_DIR}/requirements-graphify.txt"

  echo "setup-agent-tools: writing .cursor/rules/graphify.mdc..."
  "${GRAPHIFY_BIN}" cursor install

  if [[ ! -f "${ROOT_DIR}/graphify-out/graph.json" ]]; then
    echo "setup-agent-tools: building initial code-only graph (no API key required)..."
    "${GRAPHIFY_BIN}" . --code-only
    "${GRAPHIFY_BIN}" cluster-only .
  else
    echo "setup-agent-tools: graphify-out/graph.json exists — run ./scripts/graphify-update.sh to refresh"
  fi
}

install_caveman() {
  mkdir -p "${ROOT_DIR}/.cursor/rules" "${ROOT_DIR}/.cursor/skills/caveman"
  echo "setup-agent-tools: installing caveman rule + skill..."
  curl -fsSL "${CAVEMAN_RULE_URL}" -o "${ROOT_DIR}/.cursor/rules/caveman.mdc"
  curl -fsSL "${CAVEMAN_SKILL_URL}" -o "${ROOT_DIR}/.cursor/skills/caveman/SKILL.md"
}

install_rtk() {
  if ! command -v rtk >/dev/null 2>&1; then
    echo "setup-agent-tools: installing rtk to ~/.local/bin..."
    curl -fsSL "${RTK_INSTALL_URL}" | sh
  else
    echo "setup-agent-tools: rtk already on PATH ($(rtk --version 2>/dev/null || echo unknown))"
  fi

  export PATH="${HOME}/.local/bin:${PATH}"
  mkdir -p "${HOME}/.claude"

  echo "setup-agent-tools: registering Cursor hook in ~/.cursor/hooks.json..."
  rtk init -g --agent cursor --auto-patch

  echo "setup-agent-tools: RTK active — Cursor reloads hooks.json automatically"
}

cd "${ROOT_DIR}"

if [[ "${SKIP_GRAPHIFY}" == "false" ]]; then
  install_graphify
fi

if [[ "${SKIP_CAVEMAN}" == "false" ]]; then
  install_caveman
fi

if [[ "${SKIP_RTK}" == "false" ]]; then
  install_rtk
fi

cat <<EOF

Agent tools ready.

  graphify  — query before grep/read: ${GRAPHIFY_BIN} query "..."
              refresh after edits:     ./scripts/graphify-update.sh
  caveman   — terse replies:           say "talk like caveman" or use /caveman
  rtk       — compact shell output:    automatic on Shell tool calls (global hook)

Optional: set GOOGLE_API_KEY or ANTHROPIC_API_KEY then re-run setup without --code-only
          to include docs/images in the graph (graphify . without --code-only).

EOF
