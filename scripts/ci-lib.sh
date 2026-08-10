#!/usr/bin/env bash
# Shared helpers for CI step scripts (source, do not execute directly).
set -euo pipefail

if [[ -z "${CI_ROOT_DIR:-}" ]]; then
  CI_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

CI_STEP_START_MS=""

ci_banner() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

ci_step_begin() {
  local name="$1"
  ci_banner "${name}"
  CI_STEP_START_MS="$(date +%s%3N)"
}

ci_step_end() {
  local name="$1"
  local end_ms
  end_ms="$(date +%s%3N)"
  local elapsed_ms=$((end_ms - CI_STEP_START_MS))
  local elapsed_s=$((elapsed_ms / 1000))
  echo "✓ ${name} (${elapsed_s}s)"
}

ci_resolve_ctest() {
  if command -v ctest >/dev/null 2>&1; then
    echo "ctest"
    return 0
  fi
  if [[ -x "${CI_ROOT_DIR}/.venv-build/bin/ctest" ]]; then
    echo "${CI_ROOT_DIR}/.venv-build/bin/ctest"
    return 0
  fi
  echo "ctest not found. Install cmake or create ${CI_ROOT_DIR}/.venv-build." >&2
  return 1
}

ci_run_backend_unit_tests() {
  local ctest_bin
  ctest_bin="$(ci_resolve_ctest)"
  local tests_bin="${CI_ROOT_DIR}/server/build/pixelanea_tests"
  local build_dir="${CI_ROOT_DIR}/server/build"

  if [[ ! -x "${tests_bin}" ]]; then
    echo "ERROR: ${tests_bin} missing — run ./scripts/ci-steps/08b-server-compile.sh first" >&2
    return 1
  fi

  if [[ -f "${build_dir}/CTestTestfile.cmake" ]]; then
    local total
    total="$("${ctest_bin}" --test-dir "${build_dir}" -N 2>/dev/null | awk '/Total Tests:/ {print $3}' || echo 0)"
    if [[ "${total:-0}" -gt 0 ]]; then
      echo "→ ctest (${total} registered tests)"
      "${ctest_bin}" --test-dir "${build_dir}" --output-on-failure
      return 0
    fi
    echo "→ CTest registry empty (binary cache restore) — running pixelanea_tests directly"
  else
    echo "→ CTest metadata missing — running pixelanea_tests directly"
  fi

  "${tests_bin}"
}

# Profiles: space-separated step basenames (without .sh), order preserved.
ci_profile_steps() {
  case "$1" in
    fast)
      echo "00-verify-version 03-lint 04-typecheck 05-test-qa 06-test-unit"
      ;;
    hook-commit)
      echo "03-lint 04-typecheck"
      ;;
    hook-push)
      echo "00-verify-version 01-deps 02-api-assets 05-test-qa 06-test-unit 07-build-web 08a-server-configure 08b-server-compile 09-test-backend-unit"
      ;;
    core)
      echo "00-verify-version 01-deps 02-api-assets 03-lint 04-typecheck 05-test-qa 06-test-unit 07-build-web 08a-server-configure 08b-server-compile 09-test-backend-unit"
      ;;
    e2e)
      echo "00-verify-version 01-deps 02-api-assets 03-lint 04-typecheck 05-test-qa 06-test-unit 07-build-web 08a-server-configure 08b-server-compile 09-test-backend-unit 10-e2e-install 11-test-e2e"
      ;;
    full | all)
      echo "00-verify-version 01-deps 02-api-assets 03-lint 04-typecheck 05-test-qa 06-test-unit 07-build-web 08a-server-configure 08b-server-compile 09-test-backend-unit 12-smoke-backend 13-smoke-frontend"
      ;;
    sprint | sprint1)
      echo "04-typecheck 05-test-qa 06-test-unit 08a-server-configure 08b-server-compile 09-test-backend-unit"
      ;;
    *)
      return 1
      ;;
  esac
}

ci_list_profiles() {
  echo "CI profiles (run: ./scripts/ci.sh <profile>)"
  echo "  hook-commit — lint + typecheck (pre-commit hook)"
  echo "  hook-push   — verify, deps, tests, builds (pre-push hook)"
  echo "  fast    — lint, typecheck, QA matrix, unit tests"
  echo "  core    — fast + web/server build + backend unit tests"
  echo "  e2e     — core + Playwright E2E (manual only; not in GitHub Actions)"
  echo "  full    — core + smoke scripts (GitHub Actions build job)"
  echo "  sprint  — typecheck, QA, unit, server build, backend tests"
}

ci_run_step_script() {
  local steps_dir="$1"
  local id="$2"
  local script=""

  if [[ -f "${steps_dir}/${id}.sh" ]]; then
    script="${steps_dir}/${id}.sh"
  elif [[ -f "${steps_dir}/${id}" ]]; then
    script="${steps_dir}/${id}"
  else
    script="$(find "${steps_dir}" -maxdepth 1 -name "${id}*.sh" | head -1)"
  fi

  if [[ -z "${script}" || ! -f "${script}" ]]; then
    echo "Unknown CI step: ${id}" >&2
    return 1
  fi

  bash "${script}"
}
