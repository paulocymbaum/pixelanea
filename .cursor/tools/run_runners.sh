#!/usr/bin/env bash
# Execute Pixelanea CI step scripts and write loop/runners/*.json.
#
# Only this helper (or check_condition.sh that calls it) may write runner JSON.
# Cap / pass / continue are decided later by check_runner_gate + loop_management.js.
#
# Usage (from Pixelanea repo root):
#   ./scripts/... no — call via:
#   bash .cursor/tools/run_runners.sh --loop-dir path/to/loop [--profile develop|deliver]
#
# Env:
#   HARNESS_PROFILE          develop (default) | deliver
#   HARNESS_INCLUDE_BACKEND  1 → also run 09-test-backend-unit into unit.json
#   HARNESS_SKIP_RUN         1 → do not execute CI; only rewrite summary from existing JSON
#   HARNESS_LOG_TAIL_LINES   default 80
#
# Develop: 03-lint, 04-typecheck → lint.json; 06-test-unit (+ optional 09) → unit.json
# Deliver: same + e2e.json via ./scripts/ci.sh e2e (or steps 10+11)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STEPS_DIR="${ROOT_DIR}/scripts/ci-steps"

LOOP_DIR=""
PROFILE="${HARNESS_PROFILE:-develop}"
INCLUDE_BACKEND="${HARNESS_INCLUDE_BACKEND:-0}"
SKIP_RUN="${HARNESS_SKIP_RUN:-0}"
TAIL_LINES="${HARNESS_LOG_TAIL_LINES:-80}"

usage() {
  cat <<'EOF'
Usage: bash .cursor/tools/run_runners.sh --loop-dir <path/to/loop> [options]

Options:
  --loop-dir <path>     Absolute or repo-relative path to the loop/ folder
  --profile <name>      develop (default) | deliver
  --include-backend     Include ./scripts/ci.sh 09-test-backend-unit in unit.json
  --skip-run            Rebuild summary.json from existing runner files only
  --help                Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --loop-dir)
      LOOP_DIR="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --include-backend)
      INCLUDE_BACKEND=1
      shift
      ;;
    --skip-run)
      SKIP_RUN=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "run_runners: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${LOOP_DIR}" ]]; then
  echo "run_runners: --loop-dir is required" >&2
  exit 2
fi

if [[ "${LOOP_DIR}" != /* ]]; then
  LOOP_DIR="${ROOT_DIR}/${LOOP_DIR}"
fi

case "${PROFILE}" in
  develop|deliver) ;;
  *)
    echo "run_runners: invalid profile '${PROFILE}' (use develop|deliver)" >&2
    exit 2
    ;;
esac

RUNNERS_DIR="${LOOP_DIR}/runners"
LOG_DIR="${RUNNERS_DIR}/logs"
mkdir -p "${LOG_DIR}"

write_runner_json() {
  local name="$1"
  local exit_code="$2"
  local log_rel="$3"
  local steps_csv="$4"
  cat >"${RUNNERS_DIR}/${name}.json" <<EOF
{
  "exit": ${exit_code},
  "log": "${log_rel}",
  "steps": [${steps_csv}],
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

run_ci_steps() {
  local name="$1"
  shift
  local -a steps=("$@")
  local log_file="${LOG_DIR}/${name}.log"
  local log_rel
  log_rel="$(realpath --relative-to="${ROOT_DIR}" "${log_file}" 2>/dev/null || echo "${log_file}")"
  local exit_code=0
  local steps_csv=""
  local step
  local first=1

  : >"${log_file}"
  {
    echo "=== harness runner: ${name} (profile=${PROFILE}) ==="
    echo "started_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  } >>"${log_file}"

  for step in "${steps[@]}"; do
    if [[ ${first} -eq 1 ]]; then
      steps_csv="\"${step}\""
      first=0
    else
      steps_csv="${steps_csv}, \"${step}\""
    fi
    echo "" >>"${log_file}"
    echo "--- ./scripts/ci.sh ${step} ---" >>"${log_file}"
    set +e
    (
      cd "${ROOT_DIR}"
      ./scripts/ci.sh "${step}"
    ) >>"${log_file}" 2>&1
    local step_exit=$?
    set -e
    echo "exit=${step_exit}" >>"${log_file}"
    if [[ ${step_exit} -ne 0 && ${exit_code} -eq 0 ]]; then
      exit_code=${step_exit}
    fi
  done

  # Truncate to tail for token budget (keep file small for next context).
  if [[ -f "${log_file}" ]]; then
    local tmp
    tmp="$(mktemp)"
    tail -n "${TAIL_LINES}" "${log_file}" >"${tmp}"
    mv "${tmp}" "${log_file}"
  fi

  write_runner_json "${name}" "${exit_code}" "${log_rel}" "${steps_csv}"
  return 0
}

run_e2e_profile() {
  local log_file="${LOG_DIR}/e2e.log"
  local log_rel
  log_rel="$(realpath --relative-to="${ROOT_DIR}" "${log_file}" 2>/dev/null || echo "${log_file}")"
  : >"${log_file}"
  {
    echo "=== harness runner: e2e (profile=deliver) ==="
    echo "started_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "--- ./scripts/ci.sh e2e ---"
  } >>"${log_file}"
  set +e
  (
    cd "${ROOT_DIR}"
    ./scripts/ci.sh e2e
  ) >>"${log_file}" 2>&1
  local exit_code=$?
  set -e
  echo "exit=${exit_code}" >>"${log_file}"
  local tmp
  tmp="$(mktemp)"
  tail -n "${TAIL_LINES}" "${log_file}" >"${tmp}"
  mv "${tmp}" "${log_file}"
  write_runner_json "e2e" "${exit_code}" "${log_rel}" "\"e2e\""
}

if [[ "${SKIP_RUN}" != "1" ]]; then
  # Lint group: boundary + typecheck (Develop stop bit).
  run_ci_steps lint 03-lint 04-typecheck

  # Unit group: frontend vitest; optional backend ctest when server batch in scope.
  if [[ "${INCLUDE_BACKEND}" == "1" ]]; then
    run_ci_steps unit 06-test-unit 09-test-backend-unit
  else
    run_ci_steps unit 06-test-unit
  fi

  if [[ "${PROFILE}" == "deliver" ]]; then
    run_e2e_profile
  else
    # Develop must not leave a stale green e2e from a prior Deliver run.
    rm -f "${RUNNERS_DIR}/e2e.json"
  fi
fi

REQUIRE_E2E_FLAG=()
if [[ "${PROFILE}" == "deliver" ]]; then
  REQUIRE_E2E_FLAG=(--require-e2e)
fi

# Always refresh summary via the Node reader (single source of conjunction rules).
set +e
SUMMARY_JSON="$(
  node "${ROOT_DIR}/.cursor/tools/check_runner_gate.js" \
    --runners-dir "${RUNNERS_DIR}" \
    "${REQUIRE_E2E_FLAG[@]}" \
    --json
)"
GATE_EXIT=$?
set -e

# Persist summary with conjunction bit + status for the next stroke.
node -e '
const fs = require("fs");
const path = require("path");
const { buildSummary } = require(process.argv[1]);
const runnersDir = process.argv[2];
const profile = process.argv[3];
const requireE2e = process.argv[4] === "1";
const names = requireE2e ? ["lint", "unit", "e2e"] : ["lint", "unit"];
const map = {};
for (const name of names) {
  const p = path.join(runnersDir, name + ".json");
  if (fs.existsSync(p)) {
    map[name] = JSON.parse(fs.readFileSync(p, "utf8"));
  }
}
const summary = buildSummary(map, { profile, requireE2e });
fs.writeFileSync(path.join(runnersDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
process.stdout.write(JSON.stringify(summary) + "\n");
' \
  "${ROOT_DIR}/.cursor/tools/check_runner_gate.js" \
  "${RUNNERS_DIR}" \
  "${PROFILE}" \
  "$([[ "${PROFILE}" == "deliver" ]] && echo 1 || echo 0)"

echo "run_runners: wrote ${RUNNERS_DIR} (gate_exit=${GATE_EXIT}, profile=${PROFILE})" >&2
# Writer always exits 0 so callers can still run the reader; conjunction lives in summary.json.
exit 0
