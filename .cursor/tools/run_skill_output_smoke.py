#!/usr/bin/env python3
"""Run canonical skill-output smoke gates from .cursor/ci-smoke-manifest.txt.

Reads test.md Automated sections and matrix Status cells — no agent loop.
Stdout: human progress; stderr: errors; exit 0 when all gates pass.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / ".cursor" / "ci-smoke-manifest.txt"

OPEN_MATRIX_STATUS = re.compile(r"\|\s*`?\[\s?\]`?\s*\||\|\s*`?\[!\]`?\s*\|")
AUTOMATED_HEADING = re.compile(r"^##\s+Automated\b", re.I)
FENCE_START = re.compile(r"^```(\w*)")
CODE_FENCE = re.compile(r"^```(\w*)\s*$")


def load_manifest() -> list[tuple[str, Path]]:
    if not MANIFEST.is_file():
        print(f"manifest missing: {MANIFEST}", file=sys.stderr)
        sys.exit(2)

    entries: list[tuple[str, Path]] = []
    for raw in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t", 1)
        if len(parts) != 2:
            print(f"invalid manifest line (expected TYPE<TAB>PATH): {raw!r}", file=sys.stderr)
            sys.exit(2)
        kind, rel = parts[0].strip(), parts[1].strip()
        if kind not in ("test-md", "matrix"):
            print(f"unknown manifest type {kind!r}", file=sys.stderr)
            sys.exit(2)
        path = ROOT / rel
        if not path.is_file():
            print(f"manifest path missing: {path}", file=sys.stderr)
            sys.exit(2)
        entries.append((kind, path))
    return entries


def extract_automated_bash(text: str) -> list[str]:
    lines = text.splitlines()
    blocks: list[str] = []
    in_automated = False
    in_fence = False
    fence_lang = ""
    buf: list[str] = []

    for line in lines:
        if AUTOMATED_HEADING.match(line.strip()):
            in_automated = True
            continue
        if in_automated and line.startswith("## "):
            if in_fence:
                blocks.append("\n".join(buf))
                buf = []
                in_fence = False
            break
        if not in_automated:
            continue
        m = CODE_FENCE.match(line.strip())
        if m:
            if not in_fence:
                in_fence = True
                fence_lang = m.group(1).lower()
                buf = []
            else:
                if fence_lang in ("", "bash", "sh", "shell"):
                    blocks.append("\n".join(buf))
                buf = []
                in_fence = False
            continue
        if in_fence:
            buf.append(line)
    return blocks


def should_skip_block(block: str) -> str | None:
    if "cargo" in block and shutil.which("cargo") is None:
        return "cargo not installed (skip desktop check)"
    return None


def run_bash_block(block: str, label: str) -> None:
    skip = should_skip_block(block)
    if skip:
        print(f"SKIP {label}: {skip}")
        return
    print(f"RUN {label}")
    print(block)
    result = subprocess.run(
        block,
        shell=True,
        cwd=ROOT,
        check=False,
    )
    if result.returncode != 0:
        print(f"FAIL {label} (exit {result.returncode})", file=sys.stderr)
        sys.exit(1)
    print(f"PASS {label}")


def check_matrix(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if OPEN_MATRIX_STATUS.search(text):
        print(f"FAIL matrix {path}: open Status [ ] or [!] found", file=sys.stderr)
        sys.exit(1)
    print(f"PASS matrix {path} (no open Status cells)")


def check_test_md(path: Path) -> None:
    blocks = extract_automated_bash(path.read_text(encoding="utf-8"))
    if not blocks:
        print(f"FAIL test-md {path}: no ## Automated bash blocks", file=sys.stderr)
        sys.exit(1)
    for i, block in enumerate(blocks, start=1):
        run_bash_block(block.strip(), f"{path.name} block {i}")


def main() -> None:
    entries = load_manifest()
    if not entries:
        print("manifest empty", file=sys.stderr)
        sys.exit(2)
    print(f"skill-output smoke: {len(entries)} gate(s) from {MANIFEST.relative_to(ROOT)}")
    for kind, path in entries:
        rel = path.relative_to(ROOT)
        if kind == "test-md":
            check_test_md(path)
        else:
            check_matrix(path)
    print("skill-output smoke: all gates passed")


if __name__ == "__main__":
    main()
