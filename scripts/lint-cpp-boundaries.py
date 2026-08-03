#!/usr/bin/env python3
"""Enforce Pixelanea server layer boundaries via #include analysis.

Rules mirror ARCHITECTURE.md and .cursor/skills/pixelanea-cpp-standards/:
  api/  →  domain/  ←  db/, export/, image/
  domain/ is pure (stdlib + domain headers only).

Scans server/src/ only. Tests under server/tests/ are excluded.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT / "server" / "src"

INCLUDE_RE = re.compile(r'^\s*#\s*include\s+([<"])([^>"]+)[>"]')

SOURCE_SUFFIXES = {".cpp", ".hpp"}


@dataclass(frozen=True)
class LayerRule:
    name: str
    rel_prefix: str
    forbidden_patterns: tuple[tuple[re.Pattern[str], str], ...]


def _patterns(*pairs: tuple[str, str]) -> tuple[tuple[re.Pattern[str], str], ...]:
    return tuple((re.compile(pattern), reason) for pattern, reason in pairs)


DOMAIN_FORBIDDEN = _patterns(
    (r"^api/", "domain/ must not depend on api/"),
    (r"^db/", "domain/ must not depend on db/"),
    (r"^export/", "domain/ must not depend on export/"),
    (r"^image/", "domain/ must not depend on image/"),
    (r"^logging/", "domain/ must not depend on logging/"),
    (r"^sqlite3", "domain/ must not include SQLite"),
    (r"^httplib", "domain/ must not include HTTP"),
    (r"^zip\.h$", "domain/ must not include ZIP"),
    (r"^stb_", "domain/ must not include stb"),
    (r"nlohmann/json", "domain/ must not include JSON transport types"),
    (r"gifenc", "domain/ must not include GIF encoder"),
)

DB_FORBIDDEN = _patterns(
    (r"^api/", "db/ must not depend on api/"),
    (r"^httplib", "db/ must not include HTTP"),
)

IMAGE_FORBIDDEN = _patterns(
    (r"^api/", "image/ must not depend on api/"),
    (r"^db/", "image/ must not depend on db/"),
    (r"^export/", "image/ must not depend on export/"),
    (r"^logging/", "image/ must not depend on logging/"),
    (r"^sqlite3", "image/ must not include SQLite"),
    (r"^httplib", "image/ must not include HTTP"),
    (r"^zip\.h$", "image/ must not include ZIP"),
    (r"nlohmann/json", "image/ must not include JSON transport types"),
)

EXPORT_FORBIDDEN = _patterns(
    (r"^api/", "export/ must not depend on api/"),
    (r"^db/", "export/ must not depend on db/"),
    (r"^sqlite3", "export/ must not include SQLite"),
    (r"^httplib", "export/ must not include HTTP"),
)

LOGGING_FORBIDDEN = _patterns(
    (r"^api/", "logging/ must not depend on api/"),
    (r"^db/", "logging/ must not depend on db/"),
    (r"^export/", "logging/ must not depend on export/"),
    (r"^image/", "logging/ must not depend on image/"),
    (r"^sqlite3", "logging/ must not include SQLite"),
)

API_FORBIDDEN = _patterns(
    (r"^sqlite3", "api/ must not call SQLite directly — use repositories"),
    (r"^db/connection\.hpp$", "api/ must not open DB connections — use repositories"),
    (r"^db/migration_runner\.hpp$", "api/ must not run migrations — use repositories"),
    (r"^db/pixel_blob_codec\.hpp$", "api/ must not encode blobs — use repositories"),
)

LAYER_RULES: tuple[LayerRule, ...] = (
    LayerRule("domain", "domain/", DOMAIN_FORBIDDEN),
    LayerRule("db", "db/", DB_FORBIDDEN),
    LayerRule("image", "image/", IMAGE_FORBIDDEN),
    LayerRule("export", "export/", EXPORT_FORBIDDEN),
    LayerRule("logging", "logging/", LOGGING_FORBIDDEN),
    LayerRule("api", "api/", API_FORBIDDEN),
)

USING_NAMESPACE_STD_RE = re.compile(r"\busing\s+namespace\s+std\b")


@dataclass(frozen=True)
class Violation:
    path: Path
    line: int
    message: str

    def format(self, root: Path = ROOT) -> str:
        try:
            rel = self.path.relative_to(root)
        except ValueError:
            rel = self.path
        return f"{rel}:{self.line}: {self.message}"


def iter_source_files(src_root: Path) -> list[Path]:
    if not src_root.is_dir():
        return []
    return sorted(
        path
        for path in src_root.rglob("*")
        if path.suffix in SOURCE_SUFFIXES and path.is_file()
    )


def layer_for(path: Path, src_root: Path) -> LayerRule | None:
    rel = path.relative_to(src_root).as_posix()
    for rule in LAYER_RULES:
        if rel.startswith(rule.rel_prefix):
            return rule
    return None


def check_includes(path: Path, rule: LayerRule) -> list[Violation]:
    violations: list[Violation] = []
    text = path.read_text(encoding="utf-8")
    for line_no, line in enumerate(text.splitlines(), start=1):
        match = INCLUDE_RE.match(line)
        if not match:
            continue
        include_path = match.group(2)
        for pattern, reason in rule.forbidden_patterns:
            if pattern.search(include_path):
                violations.append(
                    Violation(
                        path,
                        line_no,
                        f"{reason} (include: {include_path})",
                    )
                )
                break
    return violations


def check_header_style(path: Path) -> list[Violation]:
    if path.suffix != ".hpp":
        return []
    violations: list[Violation] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if USING_NAMESPACE_STD_RE.search(line):
            violations.append(
                Violation(
                    path,
                    line_no,
                    "do not use `using namespace std` in headers",
                )
            )
    return violations


def lint(src_root: Path) -> list[Violation]:
    violations: list[Violation] = []
    for path in iter_source_files(src_root):
        rule = layer_for(path, src_root)
        if rule is not None:
            violations.extend(check_includes(path, rule))
        violations.extend(check_header_style(path))
    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--src-root",
        type=Path,
        default=SRC_ROOT,
        help="server/src directory (default: %(default)s)",
    )
    args = parser.parse_args()
    src_root = args.src_root.resolve()

    violations = lint(src_root)
    if not violations:
        print(f"cpp-boundaries: OK ({len(iter_source_files(src_root))} files under server/src/)")
        return 0

    print(f"cpp-boundaries: {len(violations)} violation(s)", file=sys.stderr)
    for violation in violations:
        print(violation.format(), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
