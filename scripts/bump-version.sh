#!/usr/bin/env bash
# Increment patch in VERSION and sync all manifests.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT_DIR}/VERSION"

current="$(tr -d '[:space:]' < "${VERSION_FILE}")"
IFS='.' read -r major minor patch <<< "${current}"
patch=$((patch + 1))
new_version="${major}.${minor}.${patch}"

echo "${new_version}" > "${VERSION_FILE}"
"${ROOT_DIR}/scripts/sync-version.sh"
