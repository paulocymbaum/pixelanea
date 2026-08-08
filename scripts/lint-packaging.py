#!/usr/bin/env python3
"""Verify desktop packaging scripts and Tauri bundle configuration."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_SCRIPTS = (
    "scripts/package-deb.sh",
    "scripts/package-dmg.sh",
    "scripts/package-windows.ps1",
    "scripts/test-package-linux.sh",
    "scripts/test-package-macos.sh",
    "scripts/test-package-windows.ps1",
    "scripts/stage-desktop-assets.sh",
    "scripts/stage-linux-desktop.sh",
    "scripts/stage-macos-desktop.sh",
    "scripts/stage-windows-desktop.ps1",
)

REQUIRED_TAURI_TARGETS = {"deb", "dmg", "nsis"}

REQUIRED_ICONS = (
    "apps/desktop/src-tauri/icons/icon.icns",
    "apps/desktop/src-tauri/icons/icon.ico",
    "apps/desktop/src-tauri/icons/32x32.png",
    "apps/desktop/src-tauri/icons/128x128.png",
)


def check_scripts() -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_SCRIPTS:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing packaging script: {relative}")
    return errors


def check_tauri_config() -> list[str]:
    errors: list[str] = []
    config_path = ROOT / "apps/desktop/src-tauri/tauri.conf.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    bundle = config.get("bundle", {})
    targets = set(bundle.get("targets", []))
    missing = REQUIRED_TAURI_TARGETS - targets
    if missing:
        errors.append(
            f"tauri.conf.json bundle.targets missing: {', '.join(sorted(missing))}"
        )

    resources = bundle.get("resources", {})
    resource_key = "bundle-resources/pixelanea/"
    if resource_key not in resources:
        errors.append("tauri.conf.json missing bundle-resources/pixelanea/ resource mapping")

    frontend_dist = config.get("build", {}).get("frontendDist")
    expected = "../../../apps/web/dist"
    if frontend_dist != expected:
        errors.append(
            f"tauri.conf.json build.frontendDist is {frontend_dist}, expected {expected}"
        )
    return errors


def check_icons() -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_ICONS:
        if not (ROOT / relative).is_file():
            errors.append(f"Missing Tauri icon: {relative}")
    return errors


def main() -> int:
    errors: list[str] = []
    errors.extend(check_scripts())
    errors.extend(check_tauri_config())
    errors.extend(check_icons())

    if errors:
        print("lint-packaging: FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("lint-packaging: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
