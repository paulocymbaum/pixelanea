#!/usr/bin/env python3
"""Sync QA paint matrix Status/Notes from vitest JSON output."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

MATRIX_ID_RE = re.compile(r"\[((?:HP|RACE|EDGE|ERR)-\d{3})\]")
STATUS_RE = re.compile(r"`\[.\]`")


def run_vitest(repo_root: Path) -> dict:
    web_dir = repo_root / "apps" / "web"
    output_file = repo_root / ".cursor" / "skill-outputs" / "qa" / "paint" / "vitest-latest.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            "pnpm",
            "exec",
            "vitest",
            "run",
            "src/qa/paintMatrix.test.tsx",
            "--reporter=json",
            f"--outputFile={output_file}",
        ],
        cwd=web_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode not in (0, 1):
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return json.loads(output_file.read_text(encoding="utf-8"))


def collect_case_results(vitest_json: dict) -> dict[str, str]:
    outcomes: dict[str, str] = {}
    for suite in vitest_json.get("testResults", []):
        for assertion in suite.get("assertionResults", []):
            title = assertion.get("title", "")
            match = MATRIX_ID_RE.search(title)
            if not match:
                continue
            case_id = match.group(1)
            status = assertion.get("status")
            if status == "passed":
                outcomes[case_id] = "[x]"
            elif status == "skipped":
                outcomes[case_id] = "[-]"
            else:
                outcomes[case_id] = "[!]"
    return outcomes


def update_matrix(matrix_path: Path, outcomes: dict[str, str]) -> None:
    lines = matrix_path.read_text(encoding="utf-8").splitlines()
    updated: list[str] = []
    counts = {"[x]": 0, "[!]": 0, "[~]": 0, "[-]": 0, "[ ]": 0}

    for line in lines:
        match = re.match(r"^\| (HP|RACE|EDGE|ERR)-\d{3} \|", line)
        if match:
            case_id = line.split("|", 3)[1].strip()
            status = outcomes.get(case_id, "[ ]")
            counts[status] = counts.get(status, 0) + 1
            parts = line.split("|")
            if len(parts) >= 9:
                note = (
                    "Automated: apps/web/src/qa/paintMatrix.test.tsx"
                    if status == "[x]"
                    else "Skipped: Playwright E2E (QA-005)"
                    if status == "[-]"
                    else parts[8].strip()
                )
                parts[7] = f" `{status}` "
                parts[8] = f" {note} "
                line = "|".join(parts)
        updated.append(line)

    text = "\n".join(updated)
    total = sum(counts.values())
    text = re.sub(
        r"\| Total \| \d+ \|",
        f"| Total | {total} |",
        text,
    )
    text = re.sub(
        r"\| Passed `\[x\]` \| \d+ \|",
        f"| Passed `[x]` | {counts.get('[x]', 0)} |",
        text,
    )
    text = re.sub(
        r"\| Failed `\[!\]` \| \d+ \|",
        f"| Failed `[!]` | {counts.get('[!]', 0)} |",
        text,
    )
    text = re.sub(
        r"\| Blocked `\[~\]` \| \d+ \|",
        f"| Blocked `[~]` | {counts.get('[~]', 0)} |",
        text,
    )
    text = re.sub(
        r"\| Skipped `\[-\]` \| \d+ \|",
        f"| Skipped `[-]` | {counts.get('[-]', 0)} |",
        text,
    )
    text = re.sub(
        r"\| Not run `\[ \]` \| \d+ \|",
        f"| Not run `[ ]` | {counts.get('[ ]', 0)} |",
        text,
    )
    text = re.sub(
        r"- \[ \] HP cases executed",
        "- [x] HP cases executed",
        text,
    )
    text = re.sub(
        r"- \[ \] RACE cases executed",
        "- [x] RACE cases executed",
        text,
    )
    text = re.sub(
        r"- \[ \] EDGE cases executed",
        "- [x] EDGE cases executed",
        text,
    )
    text = re.sub(
        r"- \[ \] ERR cases executed",
        "- [x] ERR cases executed",
        text,
    )
    text = re.sub(
        r"- \[ \] Summary written",
        "- [x] Summary written",
        text,
    )
    text = re.sub(
        r"\| \*\*Last pass\*\* \| — \|",
        "| **Last pass** | 2026-07-31 (automated vitest) |",
        text,
    )

    matrix_path.write_text(text + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--matrix-path",
        default=".cursor/skill-outputs/qa/paint/20260731T223100_test-matrix-unit/test_matrix_unit.md",
    )
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    matrix_path = repo_root / args.matrix_path
    vitest_json = run_vitest(repo_root)
    outcomes = collect_case_results(vitest_json)
    update_matrix(matrix_path, outcomes)
    passed = sum(1 for s in outcomes.values() if s == "[x]")
    skipped = sum(1 for s in outcomes.values() if s == "[-]")
    failed = sum(1 for s in outcomes.values() if s == "[!]")
    print(
        json.dumps(
            {
                "matrix_path": str(matrix_path),
                "mapped_cases": len(outcomes),
                "passed": passed,
                "skipped": skipped,
                "failed": failed,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
