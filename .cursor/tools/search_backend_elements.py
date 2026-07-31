#!/usr/bin/env python3
"""Search Pixelanea backend layers for code elements with similar names.

Agents call this tool to locate classes, repositories, handlers, domain types,
and other symbols inside a specific `server/` layer without guessing paths.

Usage:
  python .cursor/tools/search_backend_elements.py --layer domain Frame PixelGrid
  python .cursor/tools/search_backend_elements.py --layer db ProjectRepository
  python .cursor/tools/search_backend_elements.py --layer api '["put_frame","FrameRepository"]'
  python .cursor/tools/search_backend_elements.py --list-layers
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable, Iterator

# Layer name → path relative to the repo root (see ARCHITECTURE.md / cpp skill).
BACKEND_LAYERS: dict[str, str] = {
    "api": "server/src/api",
    "domain": "server/src/domain",
    "db": "server/src/db",
    "migrations": "server/db/migrations",
    "export": "server/src/export",
    "image": "server/src/image",
}

LAYER_ALIASES: dict[str, str] = {
    "server/api": "api",
    "server/domain": "domain",
    "server/db": "db",
    "server/export": "export",
    "server/image": "image",
    "persistence": "db",
    "repository": "db",
    "repositories": "db",
    "bundle": "export",
    "pixelate": "image",
    "handlers": "api",
}

CPP_EXTENSIONS = {".h", ".hpp", ".hh", ".cpp", ".cc", ".cxx"}
SQL_EXTENSIONS = {".sql"}
SOURCE_EXTENSIONS = CPP_EXTENSIONS | SQL_EXTENSIONS
DEFAULT_MIN_SIMILARITY = 0.62
MAX_MATCHES_PER_QUERY = 25
SKIP_FILENAME_STEMS = {"main", "types"}

CPP_ELEMENT_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"^\s*class\s+(\w+)"), "class"),
    (re.compile(r"^\s*struct\s+(\w+)"), "struct"),
    (re.compile(r"^\s*enum\s+(?:class\s+)?(\w+)"), "enum"),
    (re.compile(r"^\s*namespace\s+(\w+)"), "namespace"),
    (re.compile(r"^\s*using\s+(\w+)\s*="), "using-alias"),
    (re.compile(r"^\s*typedef\b.*\b(\w+)\s*;"), "typedef"),
    (re.compile(r"^\s*#define\s+(\w+)"), "macro"),
    (
        re.compile(
            r"^\s*(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?(?:constexpr\s+)?"
            r"[\w:<>,\s*&~]+\s+(\w+)\s*\("
        ),
        "function",
    ),
)

SQL_ELEMENT_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", re.I), "table"),
    (re.compile(r"CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", re.I), "index"),
    (re.compile(r"CREATE\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", re.I), "view"),
    (re.compile(r"ALTER\s+TABLE\s+(\w+)", re.I), "table"),
)


@dataclass(frozen=True)
class CodeElement:
    name: str
    kind: str
    file: str
    line: int
    context: str


@dataclass(frozen=True)
class ElementMatch:
    query: str
    element: str
    kind: str
    similarity: float
    file: str
    line: int
    context: str


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def normalize_layer_name(raw: str) -> str:
    key = raw.strip().lower().replace("\\", "/")
    return LAYER_ALIASES.get(key, key)


def resolve_layer_path(layer: str, root: Path) -> tuple[str, Path]:
    normalized = normalize_layer_name(layer)
    if normalized not in BACKEND_LAYERS:
        supported = ", ".join(sorted(BACKEND_LAYERS))
        raise ValueError(
            f"Unknown backend layer {layer!r}. Supported layers: {supported}"
        )
    relative = BACKEND_LAYERS[normalized]
    return normalized, root / relative


def normalize_identifier(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def similarity_score(query: str, candidate: str) -> float:
    query_norm = normalize_identifier(query)
    candidate_norm = normalize_identifier(candidate)
    if not query_norm or not candidate_norm:
        return 0.0
    if query_norm == candidate_norm:
        return 1.0

    shorter, longer = sorted((query_norm, candidate_norm), key=len)
    if shorter and shorter in longer:
        coverage = len(shorter) / len(longer)
        return 0.82 + (0.16 * coverage)

    return SequenceMatcher(None, query_norm, candidate_norm).ratio()


def iter_source_files(search_root: Path) -> Iterator[Path]:
    if not search_root.exists():
        return
    for path in sorted(search_root.rglob("*")):
        if path.is_file() and path.suffix in SOURCE_EXTENSIONS:
            yield path


def patterns_for_file(path: Path) -> tuple[tuple[re.Pattern[str], str], ...]:
    if path.suffix in SQL_EXTENSIONS:
        return SQL_ELEMENT_PATTERNS
    return CPP_ELEMENT_PATTERNS


def extract_elements_from_file(path: Path, repo_root: Path) -> list[CodeElement]:
    relative = path.relative_to(repo_root).as_posix()
    elements: list[CodeElement] = []
    patterns = patterns_for_file(path)

    stem = path.stem
    if stem not in SKIP_FILENAME_STEMS:
        elements.append(
            CodeElement(
                name=stem,
                kind="filename",
                file=relative,
                line=1,
                context=path.name,
            )
        )

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return elements

    for line_number, line in enumerate(lines, start=1):
        for pattern, kind in patterns:
            match = pattern.search(line)
            if not match:
                continue
            elements.append(
                CodeElement(
                    name=match.group(1),
                    kind=kind,
                    file=relative,
                    line=line_number,
                    context=line.strip(),
                )
            )
            break

    return elements


def collect_elements(search_root: Path, repo_root: Path) -> list[CodeElement]:
    elements: list[CodeElement] = []
    for file_path in iter_source_files(search_root):
        elements.extend(extract_elements_from_file(file_path, repo_root))
    return elements


def find_similar_elements(
    queries: Iterable[str],
    elements: list[CodeElement],
    *,
    min_similarity: float,
    max_matches_per_query: int,
) -> list[ElementMatch]:
    matches: list[ElementMatch] = []

    for query in queries:
        query = query.strip()
        if not query:
            continue

        ranked: list[ElementMatch] = []
        for element in elements:
            score = similarity_score(query, element.name)
            if score < min_similarity:
                continue
            ranked.append(
                ElementMatch(
                    query=query,
                    element=element.name,
                    kind=element.kind,
                    similarity=round(score, 4),
                    file=element.file,
                    line=element.line,
                    context=element.context,
                )
            )

        ranked.sort(
            key=lambda item: (-item.similarity, item.file, item.line, item.element)
        )
        matches.extend(ranked[:max_matches_per_query])

    return matches


def parse_queries(raw_queries: list[str]) -> list[str]:
    if not raw_queries:
        return []

    if len(raw_queries) == 1:
        candidate = raw_queries[0].strip()
        if candidate.startswith("["):
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON query array: {exc}") from exc
            if not isinstance(parsed, list) or not all(
                isinstance(item, str) for item in parsed
            ):
                raise ValueError("Query JSON value must be an array of strings")
            return parsed

    return raw_queries


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Search a Pixelanea backend layer for similarly named code elements.",
    )
    parser.add_argument(
        "--layer",
        help="Backend layer name (e.g. api, domain, db, export, image, migrations).",
    )
    parser.add_argument(
        "queries",
        nargs="*",
        help="Search terms. Multiple values or one JSON array string.",
    )
    parser.add_argument(
        "--min-similarity",
        type=float,
        default=DEFAULT_MIN_SIMILARITY,
        help=f"Minimum similarity score in [0, 1]. Default: {DEFAULT_MIN_SIMILARITY}",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=MAX_MATCHES_PER_QUERY,
        help=f"Maximum matches per query. Default: {MAX_MATCHES_PER_QUERY}",
    )
    parser.add_argument(
        "--list-layers",
        action="store_true",
        help="Print supported backend layers and exit.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list_layers:
        payload = {
            "layers": {
                name: BACKEND_LAYERS[name] for name in sorted(BACKEND_LAYERS)
            },
            "aliases": LAYER_ALIASES,
        }
        print(json.dumps(payload, indent=2))
        return 0

    if not args.layer:
        parser.error("--layer is required unless --list-layers is used")

    try:
        queries = parse_queries(list(args.queries))
        if not queries:
            parser.error("Provide at least one query term")

        root = project_root()
        layer_name, search_root = resolve_layer_path(args.layer, root)
        elements = collect_elements(search_root, root)
        matches = find_similar_elements(
            queries,
            elements,
            min_similarity=args.min_similarity,
            max_matches_per_query=args.max_matches,
        )

        payload = {
            "layer": layer_name,
            "searchRoot": search_root.relative_to(root).as_posix(),
            "searchRootExists": search_root.exists(),
            "queries": queries,
            "minSimilarity": args.min_similarity,
            "matchCount": len(matches),
            "matches": [asdict(match) for match in matches],
        }
        print(json.dumps(payload, indent=2))
        return 0
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
