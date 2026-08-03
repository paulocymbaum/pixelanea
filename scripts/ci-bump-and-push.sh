#!/usr/bin/env bash
# Bump VERSION on CI and push with conflict retry (+1 from latest remote on each attempt).
#
# Branch bump policy (semver major.minor.patch):
#   develop       -> patch  (e.g. 1.0.0 -> 1.0.1)
#   main|master   -> minor  (e.g. 1.0.5 -> 1.1.0)
#   major         -> manual only: ./scripts/bump-version.sh major
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

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

VERSION_PATHS=(
  VERSION
  package.json
  apps/web/package.json
  packages/api-client/package.json
  contracts/openapi.yaml
  server/src/api/http_response.hpp
  server/vcpkg.json
)

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  echo "==> Version bump attempt ${attempt}/${MAX_ATTEMPTS} (${BUMP_LEVEL} on ${BRANCH})"

  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"

  "${ROOT_DIR}/scripts/bump-version.sh" "${BUMP_LEVEL}"
  NEW_VERSION="$(tr -d '[:space:]' < VERSION)"

  git add "${VERSION_PATHS[@]}"
  git commit -m "chore: bump ${BUMP_LEVEL} version to ${NEW_VERSION} [skip ci]"

  if git push origin "HEAD:${BRANCH}"; then
    echo "==> Pushed version ${NEW_VERSION}"
    exit 0
  fi

  echo "Push rejected; retrying from latest remote version..."
done

echo "ERROR: Failed to bump version after ${MAX_ATTEMPTS} attempts" >&2
exit 1
