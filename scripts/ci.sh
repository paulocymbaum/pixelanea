#!/usr/bin/env bash
# Full CI gate — mirrors .github/workflows/build.yml (build job).
# Playwright E2E is manual only: ./scripts/ci.sh e2e or pnpm ci:e2e
#
# Usage:
#   ./scripts/ci.sh                    # full profile (all steps)
#   ./scripts/ci.sh list               # step ids
#   ./scripts/ci.sh profiles           # named profiles
#   ./scripts/ci.sh fast               # profile: lint + typecheck + QA + unit
#   ./scripts/ci.sh core               # profile: + builds + backend unit tests
#   ./scripts/ci.sh e2e                # profile: + Playwright
#   ./scripts/ci.sh 08-build-server      # single step
#   ./scripts/ci.sh 05-test-qa 06-test-unit
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STEPS_DIR="${ROOT_DIR}/scripts/ci-steps"
CI_ROOT_DIR="${ROOT_DIR}"
# shellcheck source=ci-lib.sh
source "${ROOT_DIR}/scripts/ci-lib.sh"

list_steps() {
  echo "CI steps (run individually: ./scripts/ci.sh <id>)"
  for step in "${STEPS_DIR}"/*.sh; do
    basename "${step}" .sh
  done
}

run_profile() {
  local profile="$1"
  local steps
  if ! steps="$(ci_profile_steps "${profile}")"; then
    echo "Unknown CI profile: ${profile}" >&2
    ci_list_profiles >&2
    exit 1
  fi
  echo "=== Pixelanea CI (profile: ${profile}) ==="
  for id in ${steps}; do
    ci_run_step_script "${STEPS_DIR}" "${id}"
  done
  echo ""
  echo "=== Pixelanea CI passed (profile: ${profile}) ==="
}

run_all_steps() {
  run_profile full
}

main() {
  if [[ $# -eq 0 ]]; then
    run_profile full
    return 0
  fi

  case "$1" in
    list | --list)
      list_steps
      return 0
      ;;
    profiles | profile | --profiles)
      ci_list_profiles
      return 0
      ;;
  esac

  if ci_profile_steps "$1" >/dev/null 2>&1; then
    run_profile "$1"
    return 0
  fi

  for arg in "$@"; do
    ci_run_step_script "${STEPS_DIR}" "${arg}"
  done
}

main "$@"
