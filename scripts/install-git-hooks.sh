#!/usr/bin/env bash
# Point this repo's git hooks at scripts/git-hooks/ (versioned hooks).
#
# Usage:
#   ./scripts/install-git-hooks.sh
#
# Installed automatically via `pnpm install` (package.json prepare script).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="${ROOT_DIR}/scripts/git-hooks"

if ! git -C "${ROOT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
  echo "install-git-hooks: not a git repository — skipping" >&2
  exit 0
fi

for hook in pre-commit pre-push post-commit; do
  [[ -f "${HOOKS_DIR}/${hook}" ]] && chmod +x "${HOOKS_DIR}/${hook}"
done
git -C "${ROOT_DIR}" config core.hooksPath "${HOOKS_DIR}"

echo "Git hooks installed: core.hooksPath=${HOOKS_DIR}"
