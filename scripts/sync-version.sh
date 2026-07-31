#!/usr/bin/env bash
# Propagate VERSION to all project manifests.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT_DIR}/VERSION"

if [[ ! -f "${VERSION_FILE}" ]]; then
  echo "VERSION file not found at ${VERSION_FILE}" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "${VERSION_FILE}")"
if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid VERSION format: ${VERSION} (expected major.minor.patch)" >&2
  exit 1
fi

node <<EOF
const fs = require("fs");
const path = require("path");
const version = "${VERSION}";
const root = "${ROOT_DIR}";

for (const relativePath of [
  "package.json",
  "apps/web/package.json",
  "packages/api-client/package.json",
]) {
  const filePath = path.join(root, relativePath);
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  json.version = version;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
}
EOF

sed -i "s/^  version: .*/  version: ${VERSION}/" "${ROOT_DIR}/contracts/openapi.yaml"

sed -i "s|inline constexpr const char\\* kServerVersion = \".*\";|inline constexpr const char* kServerVersion = \"${VERSION}\";|" \
  "${ROOT_DIR}/server/src/api/http_response.hpp"

sed -i "s/\"version-string\": \".*\"/\"version-string\": \"${VERSION}\"/" \
  "${ROOT_DIR}/server/vcpkg.json"

echo "Synced version ${VERSION}"
