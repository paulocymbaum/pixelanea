#!/usr/bin/env bash
# Loop stop-condition check for: {LOOP_NAME}
#
# Sensor contract (Develop / Deliver harness gate):
#   - Reads loop/runners/*.json written by run_runners.sh (NOT model prose).
#   - RESPONSE_FILE is critic/context only — ignore EVALUATION / STATUS: complete.
#   - Exit 0 → complete (all required runners green) → orchestrator STOPS
#   - Exit 1 → continue (at least one required runner red) → orchestrator CONTINUES
#   - Exit 2 → interrupted (missing runners dir / bad JSON) → orchestrator STOPS
#
# Profile:
#   HARNESS_PROFILE=develop (default) → lint.json + unit.json
#   HARNESS_PROFILE=deliver           → + e2e.json
#   Or set REQUIRE_E2E=1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_repo_root() {
  if [[ -n "${PIXELANEA_ROOT:-}" && -f "${PIXELANEA_ROOT}/.cursor/tools/check_runner_gate.js" ]]; then
    echo "${PIXELANEA_ROOT}"
    return 0
  fi
  local dir="${SCRIPT_DIR}"
  while [[ "${dir}" != "/" ]]; do
    if [[ -f "${dir}/.cursor/tools/check_runner_gate.js" ]]; then
      echo "${dir}"
      return 0
    fi
    dir="$(dirname "${dir}")"
  done
  return 1
}

ROOT_DIR="$(find_repo_root)" || {
  echo "check_condition: cannot locate .cursor/tools/check_runner_gate.js from ${SCRIPT_DIR}" >&2
  exit 2
}

RUNNERS_DIR="${RUNNERS_DIR:-${SCRIPT_DIR}/runners}"
PROFILE="${HARNESS_PROFILE:-develop}"
REQUIRE_E2E_ARGS=()
if [[ "${REQUIRE_E2E:-0}" == "1" || "${PROFILE}" == "deliver" ]]; then
  REQUIRE_E2E_ARGS=(--require-e2e)
fi

# RESPONSE_FILE may be present for critic/context; never grep it for the stop bit.
if [[ -n "${RESPONSE_FILE:-${LOOP_RESPONSE_FILE:-}}" ]]; then
  :
fi

if [[ ! -d "${RUNNERS_DIR}" ]]; then
  echo "check_condition: missing runners dir ${RUNNERS_DIR}" >&2
  exit 2
fi

exec node "${ROOT_DIR}/.cursor/tools/check_runner_gate.js" \
  --runners-dir "${RUNNERS_DIR}" \
  "${REQUIRE_E2E_ARGS[@]}"
