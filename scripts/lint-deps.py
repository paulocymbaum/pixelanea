#!/usr/bin/env python3
"""Verify dependency manifests and root script wiring."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DEPENDENCY_INPUTS = (
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "apps/web/package.json",
    "packages/api-client/package.json",
    "scripts/requirements.txt",
    "server/vcpkg.json",
    "server/CMakeLists.txt",
    "apps/desktop/src-tauri/Cargo.toml",
    "apps/desktop/src-tauri/tauri.conf.json",
    "contracts/openapi.yaml",
)

WORKSPACE_PACKAGE_JSONS = (
    "package.json",
    "apps/web/package.json",
    "packages/api-client/package.json",
)

SCRIPT_PATH_PATTERN = re.compile(r"(?:^|[\s&|])(\./[^\s&|;]+)")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_dependency_inputs() -> list[str]:
    errors: list[str] = []
    for relative in DEPENDENCY_INPUTS:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing dependency input: {relative}")
    return errors


def check_workspace_packages() -> list[str]:
    errors: list[str] = []
    workspace_text = (ROOT / "pnpm-workspace.yaml").read_text(encoding="utf-8")
    globs: list[str] = []
    for line in workspace_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            globs.append(stripped[2:].strip().strip('"').strip("'"))

    for glob in globs:
        if glob.endswith("/*"):
            base = ROOT / glob[:-2]
            if not base.is_dir():
                errors.append(f"pnpm-workspace glob has no directory: {glob}")
                continue
            children = [p for p in base.iterdir() if p.is_dir()]
            if not children:
                errors.append(f"pnpm-workspace glob matched no packages: {glob}")
            for child in children:
                pkg = child / "package.json"
                if not pkg.is_file():
                    continue
    return errors


def check_root_scripts() -> list[str]:
    errors: list[str] = []
    scripts = load_json(ROOT / "package.json").get("scripts", {})
    for name, command in scripts.items():
        if not isinstance(command, str):
            continue
        for match in SCRIPT_PATH_PATTERN.finditer(command):
            raw = match.group(1)
            if not (raw.endswith(".sh") or raw.endswith(".ps1")):
                continue
            rel = raw[2:] if raw.startswith("./") else raw
            path = ROOT / rel
            if not path.is_file():
                errors.append(f"package.json script '{name}' references missing file: {raw}")
    return errors


def check_version_alignment() -> list[str]:
    errors: list[str] = []
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        errors.append(f"Invalid VERSION format: {version}")
        return errors

    for relative in WORKSPACE_PACKAGE_JSONS:
        actual = load_json(ROOT / relative).get("version")
        if actual != version:
            errors.append(f"{relative} version is {actual}, expected {version}")

    tauri_version = load_json(ROOT / "apps/desktop/src-tauri/tauri.conf.json").get("version")
    if tauri_version != version:
        errors.append(
            f"apps/desktop/src-tauri/tauri.conf.json version is {tauri_version}, expected {version}"
        )

    cargo_text = (ROOT / "apps/desktop/src-tauri/Cargo.toml").read_text(encoding="utf-8")
    cargo_match = re.search(r"^version = \"([^\"]+)\"", cargo_text, re.MULTILINE)
    cargo_version = cargo_match.group(1) if cargo_match else None
    if cargo_version != version:
        errors.append(
            f"apps/desktop/src-tauri/Cargo.toml version is {cargo_version}, expected {version}"
        )

    return errors


def check_api_client_wiring() -> list[str]:
    errors: list[str] = []
    web_deps = load_json(ROOT / "apps/web/package.json").get("dependencies", {})
    if web_deps.get("@pixelanea/api-client") != "workspace:*":
        errors.append("apps/web must depend on @pixelanea/api-client via workspace:*")
    return errors


def main() -> int:
    errors: list[str] = []
    errors.extend(check_dependency_inputs())
    errors.extend(check_workspace_packages())
    errors.extend(check_root_scripts())
    errors.extend(check_version_alignment())
    errors.extend(check_api_client_wiring())

    if errors:
        print("lint-deps: FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("lint-deps: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
