#!/usr/bin/env bash
# Bump VERSION on CI when source changed since the last bump, then commit and push.
#
# Branch bump policy (semver major.minor.patch):
#   develop       -> patch  (e.g. 1.0.0 -> 1.0.1)
#   main|master   -> minor  (e.g. 1.0.5 -> 1.1.0)
#   major         -> manual only: ./scripts/bump-version.sh major
#
# Skips bump (exit 0) when commits since the last "chore: bump" touch only version
# manifests — e.g. re-runs, doc-only pushes already versioned, or empty diffs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-${GITHUB_REF_NAME:-main}}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"

case "${BRANCH}" in
  develop)
    BUMP_LEVEL="patch"
    ;;
  main|master)
    BUMP_LEVEL="minor"
    ;;
  *)
    echo "No auto-bump configured for branch: ${BRANCH}" >&2
    exit 1
    ;;
esac

cd "${ROOT_DIR}"

VERSION_PATHS=(
  VERSION
  package.json
  apps/web/package.json
  packages/api-client/package.json
  apps/desktop/src-tauri/tauri.conf.json
  apps/desktop/src-tauri/Cargo.toml
  contracts/openapi.yaml
  server/src/api/http_response.hpp
  server/vcpkg.json
)

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

find_last_bump_commit() {
  git log "origin/${BRANCH}" -1 --format=%H --grep='^chore: bump ' 2>/dev/null || true
}

build_diff_pathspec() {
  local -a pathspec=( . )
  for rel in "${VERSION_PATHS[@]}"; do
    pathspec+=( ":!${rel}" )
  done
  printf '%s\n' "${pathspec[@]}"
}

has_source_changes_since() {
  local baseline="$1"
  local head="$2"
  local -a pathspec
  mapfile -t pathspec < <(build_diff_pathspec)

  if [[ -z "${baseline}" ]]; then
    echo "==> No prior version bump on ${BRANCH}; treating as source change"
    return 0
  fi

  if [[ "${baseline}" == "${head}" ]]; then
    return 1
  fi

  local changed
  changed="$(git diff --name-only "${baseline}" "${head}" -- "${pathspec[@]}" | head -n 1)"
  [[ -n "${changed}" ]]
}

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  echo "==> Version bump attempt ${attempt}/${MAX_ATTEMPTS} (${BUMP_LEVEL} on ${BRANCH})"

  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"

  HEAD_SHA="$(git rev-parse HEAD)"
  BASELINE_SHA="$(find_last_bump_commit)"

  if ! has_source_changes_since "${BASELINE_SHA}" "${HEAD_SHA}"; then
    echo "==> No source changes since last version bump (${BASELINE_SHA:-none}); skipping bump"
    exit 0
  fi

  echo "==> Source changes detected since ${BASELINE_SHA:-branch start}; bumping ${BUMP_LEVEL}"

  "${ROOT_DIR}/scripts/bump-version.sh" "${BUMP_LEVEL}"
  NEW_VERSION="$(tr -d '[:space:]' < VERSION)"

  git add "${VERSION_PATHS[@]}"

  if git diff --staged --quiet; then
    echo "==> Version manifests already at ${NEW_VERSION}; nothing to commit"
    exit 0
  fi

  git commit -m "chore: bump ${BUMP_LEVEL} version to ${NEW_VERSION} [skip ci]"

  if git push origin "HEAD:${BRANCH}"; then
    echo "==> Committed and pushed version ${NEW_VERSION}"
    exit 0
  fi

  echo "Push rejected; retrying from latest remote version..."
done

echo "ERROR: Failed to bump version after ${MAX_ATTEMPTS} attempts" >&2
exit 1
