#!/usr/bin/env bash
# Optional per-loop wrapper around the shared runner writer.
# Prefer: bash .cursor/tools/run_runners.sh --loop-dir "$(dirname "$0")" --profile develop

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_repo_root() {
  if [[ -n "${PIXELANEA_ROOT:-}" && -f "${PIXELANEA_ROOT}/.cursor/tools/run_runners.sh" ]]; then
    echo "${PIXELANEA_ROOT}"
    return 0
  fi
  local dir="${SCRIPT_DIR}"
  while [[ "${dir}" != "/" ]]; do
    if [[ -f "${dir}/.cursor/tools/run_runners.sh" ]]; then
      echo "${dir}"
      return 0
    fi
    dir="$(dirname "${dir}")"
  done
  return 1
}

ROOT_DIR="$(find_repo_root)" || {
  echo "run_runners wrapper: cannot locate .cursor/tools/run_runners.sh" >&2
  exit 2
}
PROFILE="${HARNESS_PROFILE:-develop}"
exec bash "${ROOT_DIR}/.cursor/tools/run_runners.sh" \
  --loop-dir "${SCRIPT_DIR}" \
  --profile "${PROFILE}" \
  "$@"
