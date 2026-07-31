#!/usr/bin/env python3
"""Compute a stable hash of all dependency lock inputs (names + versions)."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Sorted relative paths — any change here invalidates the dependency cache.
DEPENDENCY_INPUTS = (
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "apps/web/package.json",
    "packages/api-client/package.json",
    "server/vcpkg.json",
    "server/CMakeLists.txt",
)


def compute_deps_hash(root: Path = ROOT) -> str:
    digest = hashlib.sha256()

    for relative in DEPENDENCY_INPUTS:
        path = root / relative
        if not path.is_file():
            raise FileNotFoundError(f"Missing dependency input: {relative}")

        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")

    return digest.hexdigest()[:16]


def main() -> int:
    try:
        print(compute_deps_hash())
    except FileNotFoundError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
