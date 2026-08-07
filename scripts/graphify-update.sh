#!/usr/bin/env bash
# Incrementally refresh the graphify knowledge graph (AST-only, no API key).
#
# Usage:
#   ./scripts/graphify-update.sh
#   SKIP_GRAPHIFY_CLUSTER=1 ./scripts/graphify-update.sh   # skip GRAPH_REPORT.md regen
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_BIN="${ROOT_DIR}/.venv-graphify/bin"
GRAPHIFY="${VENV_BIN}/graphify"

if [[ ! -x "${GRAPHIFY}" ]]; then
  echo "graphify-update: .venv-graphify missing — run ./scripts/setup-agent-tools.sh first" >&2
  exit 1
fi

cd "${ROOT_DIR}"

echo "graphify-update: refreshing code graph..."
"${GRAPHIFY}" update .

if [[ "${SKIP_GRAPHIFY_CLUSTER:-}" != "1" ]]; then
  echo "graphify-update: regenerating GRAPH_REPORT.md..."
  "${GRAPHIFY}" cluster-only .
fi

echo "graphify-update: done (graphify-out/)"
