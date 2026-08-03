#!/usr/bin/env bash
# Increment VERSION (major|minor|patch) and sync all manifests.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT_DIR}/VERSION"
BUMP="${1:-patch}"

current="$(tr -d '[:space:]' < "${VERSION_FILE}")"
IFS='.' read -r major minor patch <<< "${current}"

case "${BUMP}" in
  patch)
    patch=$((patch + 1))
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  *)
    echo "Invalid bump level: ${BUMP} (expected major, minor, or patch)" >&2
    exit 1
    ;;
esac

new_version="${major}.${minor}.${patch}"

echo "${new_version}" > "${VERSION_FILE}"
"${ROOT_DIR}/scripts/sync-version.sh"
