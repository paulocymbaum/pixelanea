#!/usr/bin/env python3
"""Decision layer for the skill-unit-test-matrix orchestrator.

Reads a test_matrix_unit.md file, classifies case statuses, and returns the
next orchestration action as JSON. The main agent consumes this output and
calls the appropriate subagent or skill.

Usage:
  python3 .cursor/tools/orchestrate_unit_test_matrix.py \
      --feature qa --layer paint
  python3 .cursor/tools/orchestrate_unit_test_matrix.py \
      --matrix-path .cursor/skill-outputs/qa/paint/20260731T223100_test-matrix-unit/test_matrix_unit.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

STATUS_MEANING = {
    "[ ]": "not_run",
    "[x]": "passed",
    "[!]": "failed",
    "[~]": "blocked",
    "[-]": "skipped",
}
VALID_STATUSES = set(STATUS_MEANING.keys())

# Maps decision codes to Task-tool subagent_type values (must match Cursor Task enum).
DECISION_TO_SUBAGENT: dict[str, Optional[str]] = {
    "run_test_matrix_unit": "generalPurpose",
    "delegate_skill_implementer": "skill-implementer",
    "delegate_test_matrix_unit_recovery": "generalPurpose",
    "report_complete": None,
}

# Skill file the delegated subagent must read and follow.
DECISION_TO_SKILL: dict[str, Optional[str]] = {
    "run_test_matrix_unit": ".cursor/skills/test-matrix-unit/SKILL.md",
    "delegate_skill_implementer": None,
    "delegate_test_matrix_unit_recovery": ".cursor/skills/test-matrix-unit-recovery/SKILL.md",
    "report_complete": None,
}

DECISION_LABELS: dict[str, str] = {
    "run_test_matrix_unit": "Execute matrix (follow test-matrix-unit skill)",
    "delegate_skill_implementer": "Fix single failing case (code instability)",
    "delegate_test_matrix_unit_recovery": "Batch-recover failures (follow test-matrix-unit-recovery skill)",
    "report_complete": "Matrix stable — report to user, do not delegate",
}


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


@dataclass
class Case:
    id: str
    category: str
    name: str
    preconditions: str
    steps: str
    expected: str
    status: str
    notes: str


@dataclass
class Decision:
    matrix_path: Optional[str]
    total: int
    passed: int
    failed: int
    blocked: int
    skipped: int
    not_run: int
    open_failures: list[str] = field(default_factory=list)
    open_blocked: list[str] = field(default_factory=list)
    not_run_ids: list[str] = field(default_factory=list)
    decision: str = "report_complete"
    reason: str = "No decision made."
    case_ids: list[str] = field(default_factory=list)
    # Deprecated alias — prefer subagent_type + call_subagent.
    next_agent: Optional[str] = None
    # Orchestrator MUST read these fields first.
    call_subagent: bool = False
    subagent_type: Optional[str] = None
    skill_path: Optional[str] = None
    action_summary: str = ""
    prompt: Optional[str] = None
    max_iterations_exceeded: bool = False


def enrich_decision(decision: Decision) -> Decision:
    """Attach delegation metadata derived from decision code."""
    subagent = DECISION_TO_SUBAGENT.get(decision.decision)
    skill = DECISION_TO_SKILL.get(decision.decision)
    decision.subagent_type = subagent
    decision.skill_path = skill
    decision.next_agent = subagent  # legacy alias
    decision.call_subagent = subagent is not None
    label = DECISION_LABELS.get(decision.decision, decision.decision)
    if decision.call_subagent:
        ids = ", ".join(decision.case_ids) if decision.case_ids else "all pending"
        skill_clause = f" Read and follow {skill} first." if skill else ""
        decision.action_summary = (
            f"CALL Task(subagent_type={subagent!r}) — {label}.{skill_clause} Cases: {ids}."
        )
    else:
        decision.action_summary = f"STOP — {label}. {decision.reason}"
    return decision


def format_human_banner(decision: Decision) -> str:
    lines = [
        "",
        "╔══════════════════════════════════════════════════════════════╗",
        "║           UNIT TEST MATRIX — ORCHESTRATOR DECISION           ║",
        "╚══════════════════════════════════════════════════════════════╝",
        "",
    ]
    if decision.call_subagent:
        lines.extend(
            [
                "  ▶ ACTION REQUIRED: delegate to subagent (do not stop here)",
                "",
                f"  Task tool → subagent_type: {decision.subagent_type}",
            ]
        )
        if decision.skill_path:
            lines.append(f"  skill (read first):          {decision.skill_path}")
        lines.extend(
            [
                f"  decision:                    {decision.decision}",
                f"  reason:                      {decision.reason}",
            ]
        )
        if decision.case_ids:
            lines.append(f"  case_ids:                  {', '.join(decision.case_ids)}")
        if decision.matrix_path:
            lines.append(f"  matrix_path:               {decision.matrix_path}")
        lines.extend(
            [
                "",
                "  Pass the JSON `prompt` field verbatim to the subagent.",
                "",
            ]
        )
    else:
        lines.extend(
            [
                "  ✓ NO DELEGATION — orchestration complete for this loop",
                "",
                f"  decision:  {decision.decision}",
                f"  reason:      {decision.reason}",
                f"  passed:      {decision.passed}/{decision.total}",
                f"  failed:      {decision.failed}",
                f"  blocked:     {decision.blocked}",
                f"  not_run:     {decision.not_run}",
                "",
            ]
        )
    lines.append("  (JSON decision object is printed after this banner.)")
    lines.append("")
    return "\n".join(lines)


def find_latest_matrix(feature: str, layer: str, root: Path) -> Optional[Path]:
    base = root / ".cursor" / "skill-outputs" / feature / layer
    if not base.exists():
        return None
    candidates = sorted(
        [p for p in base.iterdir() if p.is_dir() and p.name.endswith("_test-matrix-unit")],
        reverse=True,
    )
    for candidate in candidates:
        matrix = candidate / "test_matrix_unit.md"
        if matrix.exists():
            return matrix
    return None


def parse_matrix(path: Path) -> list[Case]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    header_index: Optional[int] = None
    for i, line in enumerate(lines):
        if line.startswith("| ID ") and "Status" in line:
            header_index = i
            break

    if header_index is None:
        raise ValueError(f"Could not find cases table header in {path}")

    cases: list[Case] = []
    # Skip header and the separator line that follows it.
    for line in lines[header_index + 2 :]:
        if not line.startswith("|"):
            break
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 8:
            continue
        case_id, category, name, preconditions, steps, expected, raw_status, notes = cells[:8]
        case_id = case_id.strip()
        status = raw_status.strip().strip("`").strip()
        if case_id in ("ID", "") or status not in VALID_STATUSES:
            continue
        cases.append(
            Case(
                id=case_id,
                category=category,
                name=name,
                preconditions=preconditions,
                steps=steps,
                expected=expected,
                status=status,
                notes=notes,
            )
        )

    return cases


def matrix_path_for_output(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def make_run_prompt(matrix_path: str, feature: str, layer: str, not_run_ids: list[str]) -> str:
    if not_run_ids:
        ids_clause = f"Prioritize these not-run IDs: {', '.join(not_run_ids)}."
    else:
        ids_clause = "Run all cases in ID order."
    return (
        "Read and follow .cursor/skills/test-matrix-unit/SKILL.md completely. "
        f"Build and execute the unit test matrix for feature '{feature}' and layer '{layer}'. "
        f"Target location: {matrix_path}. If a matrix file already exists there, use it; otherwise create one from the template "
        f"at .cursor/skills/test-matrix-unit/test_matrix_unit.template.md. "
        f"Execute each case in ID order and update its Status and Notes cells immediately. "
        f"{ids_clause} "
        "When finished, append a pass summary with counts and open failures."
    )


def make_single_fix_prompt(
    matrix_path: str, case_id: str, feature: str, layer: str
) -> str:
    return (
        f"Fix the single failing unit test matrix case {case_id} for feature '{feature}' / layer '{layer}'. "
        f"Read the matrix at {matrix_path}, reproduce the failure from the Notes column, "
        "and fix only the product code needed to make the case pass. "
        "Return the fixed ID, the paths changed, and confirm the case is ready for re-test."
    )


def make_recovery_prompt(
    matrix_path: str, case_ids: list[str], feature: str, layer: str
) -> str:
    return (
        "Read and follow .cursor/skills/test-matrix-unit-recovery/SKILL.md completely. "
        f"Recover the failing unit test matrix cases for feature '{feature}' / layer '{layer}'. "
        f"Read the matrix at {matrix_path}, identify the code-instability failures among these IDs: "
        f"{', '.join(case_ids)}. Batch them by layer and dependency, delegate each batch to skill-implementer, "
        "re-run only the affected case IDs after each batch, and update the matrix Status and Notes cells. "
        "Append a recovery summary when done."
    )


def decide(
    matrix_path: Path, cases: list[Case], feature: str, layer: str, *, max_iterations_exceeded: bool
) -> Decision:
    root = project_root()
    counts = {token: 0 for token in STATUS_MEANING}
    open_failures: list[str] = []
    open_blocked: list[str] = []
    not_run_ids: list[str] = []

    for case in cases:
        counts[case.status] += 1
        if case.status == "[!]":
            open_failures.append(case.id)
        elif case.status == "[~]":
            open_blocked.append(case.id)
        elif case.status == "[ ]":
            not_run_ids.append(case.id)

    total = len(cases)
    relative_path = matrix_path_for_output(matrix_path, root)

    if max_iterations_exceeded:
        return Decision(
            matrix_path=relative_path,
            total=total,
            passed=counts["[x]"],
            failed=counts["[!]"],
            blocked=counts["[~]"],
            skipped=counts["[-]"],
            not_run=counts["[ ]"],
            open_failures=open_failures,
            open_blocked=open_blocked,
            not_run_ids=not_run_ids,
            decision="report_complete",
            reason="Maximum orchestration iterations reached; reporting current state.",
            case_ids=[],
            next_agent=None,
            prompt=None,
            max_iterations_exceeded=True,
        )

    if total == 0:
        return Decision(
            matrix_path=relative_path,
            total=0,
            passed=0,
            failed=0,
            blocked=0,
            skipped=0,
            not_run=0,
            decision="run_test_matrix_unit",
            reason="Matrix exists but contains no parseable cases; build and execute a fresh matrix.",
            case_ids=[],
            next_agent="test-matrix-unit",
            prompt=make_run_prompt(relative_path, feature, layer, []),
        )

    all_run = counts["[ ]"] == 0
    has_failed = counts["[!]"] > 0
    has_blocked = counts["[~]"] > 0

    if all_run and not has_failed and not has_blocked:
        return Decision(
            matrix_path=relative_path,
            total=total,
            passed=counts["[x]"],
            failed=0,
            blocked=0,
            skipped=counts["[-]"],
            not_run=0,
            open_failures=[],
            open_blocked=[],
            decision="report_complete",
            reason="All cases passed or were skipped; no recovery needed.",
            case_ids=[],
            next_agent=None,
            prompt=None,
        )

    if not_run_ids:
        return Decision(
            matrix_path=relative_path,
            total=total,
            passed=counts["[x]"],
            failed=counts["[!]"],
            blocked=counts["[~]"],
            skipped=counts["[-]"],
            not_run=counts["[ ]"],
            open_failures=open_failures,
            open_blocked=open_blocked,
            not_run_ids=not_run_ids,
            decision="run_test_matrix_unit",
            reason=f"{len(not_run_ids)} case(s) have not been executed yet.",
            case_ids=not_run_ids,
            next_agent="test-matrix-unit",
            prompt=make_run_prompt(relative_path, feature, layer, not_run_ids),
        )

    # All cases have been run; evaluate failures.
    # Future: inspect Notes to distinguish code-instability from setup/spec/environment.
    code_instability_ids = open_failures + open_blocked

    if not code_instability_ids:
        return Decision(
            matrix_path=relative_path,
            total=total,
            passed=counts["[x]"],
            failed=counts["[!]"],
            blocked=counts["[~]"],
            skipped=counts["[-]"],
            not_run=0,
            open_failures=[],
            open_blocked=[],
            decision="report_complete",
            reason="All run cases passed or were skipped; no code-instability failures to recover.",
            case_ids=[],
            next_agent=None,
            prompt=None,
        )

    if len(code_instability_ids) == 1:
        return Decision(
            matrix_path=relative_path,
            total=total,
            passed=counts["[x]"],
            failed=counts["[!]"],
            blocked=counts["[~]"],
            skipped=counts["[-]"],
            not_run=0,
            open_failures=open_failures,
            open_blocked=open_blocked,
            decision="delegate_skill_implementer",
            reason=f"Single code-instability failure detected: {code_instability_ids[0]}.",
            case_ids=code_instability_ids,
            next_agent="skill-implementer",
            prompt=make_single_fix_prompt(relative_path, code_instability_ids[0], feature, layer),
        )

    return Decision(
        matrix_path=relative_path,
        total=total,
        passed=counts["[x]"],
        failed=counts["[!]"],
        blocked=counts["[~]"],
        skipped=counts["[-]"],
        not_run=0,
        open_failures=open_failures,
        open_blocked=open_blocked,
        decision="delegate_test_matrix_unit_recovery",
        reason=f"{len(code_instability_ids)} code-instability failures detected; batch recovery required.",
        case_ids=code_instability_ids,
        next_agent="test-matrix-unit-recovery",
        prompt=make_recovery_prompt(relative_path, code_instability_ids, feature, layer),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Decision layer for the unit test matrix orchestrator.",
    )
    parser.add_argument("--feature", help="Feature folder under .cursor/skill-outputs (e.g. qa).")
    parser.add_argument("--layer", help="Layer folder under .cursor/skill-outputs/{feature} (e.g. paint).")
    parser.add_argument("--matrix-path", help="Absolute or repo-relative path to test_matrix_unit.md.")
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=5,
        help="Maximum orchestration loops before forcing a report (informational only).",
    )
    parser.add_argument(
        "--max-iterations-exceeded",
        action="store_true",
        help="Signal that the orchestrator reached its iteration cap.",
    )
    args = parser.parse_args(argv)

    root = project_root()

    feature = args.feature or "unknown"
    layer = args.layer or "unknown"

    matrix_path: Optional[Path] = None
    if args.matrix_path:
        matrix_path = Path(args.matrix_path)
        if not matrix_path.is_absolute():
            matrix_path = root / matrix_path
    elif args.feature and args.layer:
        matrix_path = find_latest_matrix(args.feature, args.layer, root)

    if matrix_path is None or not matrix_path.exists():
        decision = enrich_decision(
            Decision(
                matrix_path=args.matrix_path,
                total=0,
                passed=0,
                failed=0,
                blocked=0,
                skipped=0,
                not_run=0,
                decision="run_test_matrix_unit",
                reason="No existing matrix file found. Build and execute a new matrix.",
                case_ids=[],
                prompt=make_run_prompt(
                    args.matrix_path or f".cursor/skill-outputs/{feature}/{layer}",
                    feature,
                    layer,
                    [],
                ),
            )
        )
        print(format_human_banner(decision), file=sys.stderr)
        print(json.dumps(asdict(decision), indent=2))
        return 0

    try:
        cases = parse_matrix(matrix_path)
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2

    decision = enrich_decision(
        decide(
            matrix_path,
            cases,
            feature,
            layer,
            max_iterations_exceeded=args.max_iterations_exceeded,
        )
    )
    print(format_human_banner(decision), file=sys.stderr)
    print(json.dumps(asdict(decision), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
