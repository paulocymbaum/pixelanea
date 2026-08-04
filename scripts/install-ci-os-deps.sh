#!/usr/bin/env bash
# OS packages required for CI backend builds (FetchContent + native compile).
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  apt-get update
  apt-get install -y \
    build-essential \
    cmake \
    curl \
    g++ \
    gcc \
    git \
    ninja-build \
    pkg-config \
    python3-venv \
    zlib1g-dev
else
  sudo apt-get update
  sudo apt-get install -y \
    build-essential \
    cmake \
    curl \
    g++ \
    gcc \
    git \
    ninja-build \
    pkg-config \
    python3-venv \
    zlib1g-dev
fi

cmake_bin="$(command -v cmake)"
cmake_version="$("${cmake_bin}" --version | awk 'NR==1 {print $3}')"
required="3.24"
if ! python3 - "${cmake_version}" "${required}" <<'PY'
import sys

def parse(version: str) -> tuple[int, ...]:
    parts: list[int] = []
    for piece in version.split(".")[:3]:
        digits = "".join(ch for ch in piece if ch.isdigit())
        parts.append(int(digits or 0))
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts)

ok = parse(sys.argv[1]) >= parse(sys.argv[2])
raise SystemExit(0 if ok else 1)
PY
then
  echo "ERROR: cmake ${cmake_version} < ${required} (required by server/CMakeLists.txt)" >&2
  exit 1
fi

echo "==> CI OS deps ready (cmake ${cmake_version}, ninja $(command -v ninja-build || echo missing))"
