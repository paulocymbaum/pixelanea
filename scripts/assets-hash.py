#!/usr/bin/env python3
"""Compute a stable hash of build inputs for cached assets (brand, API client, web dist, server)."""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Single files that invalidate asset outputs when changed.
ASSET_FILES = (
    "contracts/openapi.yaml",
    "VERSION",
    "apps/web/index.html",
    "apps/web/vite.config.ts",
    "apps/web/tailwind.config.js",
    "apps/web/postcss.config.js",
    "apps/web/tsconfig.json",
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "packages/api-client/package.json",
    "packages/api-client/tsconfig.json",
    "packages/api-client/src/client.ts",
    "packages/api-client/src/index.ts",
    "scripts/generate-brand-pngs.py",
    "server/CMakeLists.txt",
)

# Directories walked recursively (sorted) for content hashing.
# apps/web/public is derived from brand/ — do not hash it (would invalidate on sync).
ASSET_DIRS = (
    "brand",
    "apps/web/src",
    "server/src",
    "server/db/migrations",
)


def _import_deps_hash(root: Path) -> str:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "deps_hash",
        root / "scripts" / "deps-hash.py",
    )
    if spec is None or spec.loader is None:
        raise ImportError("Could not load scripts/deps-hash.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.compute_deps_hash(root)


def _hash_bytes(digest: hashlib._Hash, label: str, data: bytes) -> None:
    digest.update(label.encode("utf-8"))
    digest.update(b"\0")
    digest.update(data)
    digest.update(b"\0")


def _hash_file(digest: hashlib._Hash, root: Path, relative: str) -> None:
    path = root / relative
    if not path.is_file():
        raise FileNotFoundError(f"Missing asset input file: {relative}")
    _hash_bytes(digest, relative, path.read_bytes())


def _hash_tree(digest: hashlib._Hash, root: Path, relative: str) -> None:
    base = root / relative
    if not base.exists():
        raise FileNotFoundError(f"Missing asset input directory: {relative}")

    for dirpath, _dirnames, filenames in os.walk(base):
        for name in sorted(filenames):
            if name == ".pixelanea-assets-hash":
                continue
            path = Path(dirpath) / name
            rel = path.relative_to(root).as_posix()
            _hash_bytes(digest, rel, path.read_bytes())


def compute_assets_hash(
    root: Path = ROOT,
    *,
    build_type: str | None = None,
) -> str:
    digest = hashlib.sha256()

    deps_hash = _import_deps_hash(root)
    _hash_bytes(digest, "deps", deps_hash.encode("utf-8"))

    cmake_build_type = build_type or os.environ.get("CMAKE_BUILD_TYPE", "Debug")
    _hash_bytes(digest, "cmake_build_type", cmake_build_type.encode("utf-8"))

    for relative in ASSET_FILES:
        _hash_file(digest, root, relative)

    for relative in ASSET_DIRS:
        _hash_tree(digest, root, relative)

    return digest.hexdigest()[:16]


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Compute Pixelanea asset cache hash")
    parser.add_argument(
        "--build-type",
        default=os.environ.get("CMAKE_BUILD_TYPE", "Debug"),
        help="CMake build type included in server binary cache key",
    )
    args = parser.parse_args()

    try:
        print(compute_assets_hash(build_type=args.build_type))
    except FileNotFoundError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
