#!/usr/bin/env bash
# Fail when VERSION is out of sync with propagated manifests.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT_DIR}/VERSION"

if [[ ! -f "${VERSION_FILE}" ]]; then
  echo "ERROR: VERSION file missing at ${VERSION_FILE}" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "${VERSION_FILE}")"
if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: invalid VERSION format: ${VERSION}" >&2
  exit 1
fi

json_version() {
  local file="$1"
  node -pe "JSON.parse(require('fs').readFileSync('${file}', 'utf8')).version"
}

for json_file in \
  "${ROOT_DIR}/package.json" \
  "${ROOT_DIR}/apps/web/package.json" \
  "${ROOT_DIR}/packages/api-client/package.json"; do
  actual="$(json_version "${json_file}")"
  if [[ "${actual}" != "${VERSION}" ]]; then
    echo "ERROR: ${json_file} version is ${actual}, expected ${VERSION}" >&2
    echo "Run: ./scripts/sync-version.sh" >&2
    exit 1
  fi
done

openapi_version="$(
  awk '/^info:/ { in_info=1; next } in_info && /^[^ ]/ { in_info=0 } in_info && /^  version:/ { print $2; exit }' \
    "${ROOT_DIR}/contracts/openapi.yaml"
)"
if [[ "${openapi_version}" != "${VERSION}" ]]; then
  echo "ERROR: contracts/openapi.yaml version is ${openapi_version}, expected ${VERSION}" >&2
  echo "Run: ./scripts/sync-version.sh" >&2
  exit 1
fi

server_version="$(
  grep -o 'kServerVersion = "[^"]*"' "${ROOT_DIR}/server/src/api/http_response.hpp" \
    | sed 's/kServerVersion = "\(.*\)"/\1/'
)"
if [[ "${server_version}" != "${VERSION}" ]]; then
  echo "ERROR: server kServerVersion is ${server_version}, expected ${VERSION}" >&2
  echo "Run: ./scripts/sync-version.sh" >&2
  exit 1
fi

vcpkg_version="$(
  grep -o '"version-string": "[^"]*"' "${ROOT_DIR}/server/vcpkg.json" \
    | sed 's/"version-string": "\(.*\)"/\1/'
)"
if [[ "${vcpkg_version}" != "${VERSION}" ]]; then
  echo "ERROR: server/vcpkg.json version-string is ${vcpkg_version}, expected ${VERSION}" >&2
  echo "Run: ./scripts/sync-version.sh" >&2
  exit 1
fi

echo "Version manifests match VERSION (${VERSION})"
