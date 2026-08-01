#!/usr/bin/env bash
# Loop stop-condition check for: {LOOP_NAME}
#
# Contract (required):
#   - RESPONSE_FILE (or LOOP_RESPONSE_FILE) points at the previous agent output.
#   - Exit 0  → stop condition MET → orchestrator STOPS the loop.
#   - Exit ≠0 → stop condition NOT met → orchestrator CONTINUES the loop.
#
# Customize the checks below for your loop goal.

set -euo pipefail

RESPONSE_FILE="${RESPONSE_FILE:-${LOOP_RESPONSE_FILE:-}}"
if [[ -z "${RESPONSE_FILE}" || ! -f "${RESPONSE_FILE}" ]]; then
  echo "check_condition: RESPONSE_FILE missing or not found" >&2
  exit 2
fi

# --- Example stop conditions (edit or replace) ---

# 1) Response contains an explicit completion marker:
# if grep -qE '^\s*STATUS:\s*complete\s*$' "${RESPONSE_FILE}"; then
#   exit 0
# fi

# 2) Response contains a success phrase:
# if grep -qi 'all tests passed' "${RESPONSE_FILE}"; then
#   exit 0
# fi

# 3) Response is valid JSON with a boolean flag:
# if command -v jq >/dev/null 2>&1 && jq -e '.done == true' "${RESPONSE_FILE}" >/dev/null; then
#   exit 0
# fi

# Default template: never stop until you add a real check.
echo "check_condition: no stop rule defined yet for {LOOP_NAME}" >&2
exit 1
