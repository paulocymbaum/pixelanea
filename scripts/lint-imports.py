#!/usr/bin/env python3
"""Detect TypeScript path collisions on case-insensitive filesystems (macOS CI)."""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOT = ROOT / "apps/web/src"
EXTENSIONS = {".ts", ".tsx"}


def find_case_collisions(root: Path) -> list[str]:
    errors: list[str] = []
    if not root.is_dir():
        return [f"Scan root missing: {root.relative_to(ROOT)}"]

    for directory in [root] + [p for p in root.rglob("*") if p.is_dir()]:
        groups: dict[str, list[Path]] = defaultdict(list)
        for path in directory.iterdir():
            if not path.is_file() or path.suffix not in EXTENSIONS:
                continue
            groups[path.stem.lower()].append(path)

        for key, paths in groups.items():
            stems = {p.stem for p in paths}
            if len(stems) > 1:
                rel_paths = ", ".join(str(p.relative_to(ROOT)) for p in sorted(paths))
                errors.append(
                    f"Case-insensitive import collision in {directory.relative_to(ROOT)}: {rel_paths}"
                )
    return errors


def main() -> int:
    errors = find_case_collisions(SCAN_ROOT)
    if errors:
        print("lint-imports: FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("lint-imports: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
