---
name: test-matrix-unit
description: Builds and executes unit/integration test matrices covering happy path, route race conditions, edge cases, and error handling. Produces test_matrix_unit.md with ID'd cases and pass/fail status boxes updated after every run. Escalates code-instability failures to skill-implementer (single failure) or test-matrix-unit-recovery (multiple/batched failures). Use when validating a feature, writing a test plan, running a test pass, or when the user mentions test matrix, happy path, race conditions, or edge-case coverage.
---

# Test Matrix Unit

Systematic test coverage for a single feature or unit under test. Output lives beside skill run artifacts under `.cursor/skill-outputs/` per [skill-output-structure.mdc](../../rules/skill-output-structure.mdc).

## Quick start

1. **Scope** — Pick `{feature}`, `{layer}`, and the unit under test (component, handler, store slice, domain function).
2. **Materialize matrix** — Copy [test_matrix_unit.template.md](test_matrix_unit.template.md) to:

   ```text
   .cursor/skill-outputs/{feature}/{layer}/{timestamp}_test-matrix-unit/test_matrix_unit.md
   ```

   Replace `{UNIT}`, `{SCOPE}`, and placeholder rows with real cases.
3. **Execute** — Run each case in ID order; update its **Status** cell immediately after the run (never batch updates).
4. **Escalate** — On failure caused by product/code instability, delegate to `skill-implementer` (single failure) or `test-matrix-unit-recovery` (multiple related failures). Do not patch production code inline in the test pass unless the user explicitly asked for a fix in this chat.

## Case categories (required)

Every matrix must include rows from all four categories:

|| Prefix | Category | What to cover |
||--------|----------|----------------|
|| `HP` | Happy path | Primary success flow; expected inputs → expected outputs |
|| `RACE` | Route / race conditions | Concurrent navigation, overlapping async requests, stale responses, rapid user input, out-of-order completion |
|| `EDGE` | Edge cases | Boundaries, empty/null, max limits, single-item lists, first/last frame, debounce windows |
|| `ERR` | Error handling | API/network failures, validation errors, 4xx/5xx, timeout, offline, malformed payload |

Add rows as needed; never omit a category.

## Case ID format

```text
{CATEGORY}-{NNN}
```

- `CATEGORY`: `HP`, `RACE`, `EDGE`, or `ERR`
- `NNN`: zero-padded sequence per category (`001`, `002`, …)

Examples: `HP-001`, `RACE-003`, `EDGE-002`, `ERR-001`.

## Status values (update after every test)

Use exactly one status per case in the **Status** column:

|| Status | Meaning |
||--------|---------|
|| `[ ]` | Not run |
|| `[x]` | Passed |
|| `[!]` | Failed |
|| `[~]` | Blocked (environment, missing fixture, or waiting on fix) |
|| `[-]` | Skipped (document reason in **Notes**) |

**Rule:** After each case executes, edit `test_matrix_unit.md` and set that row's Status before starting the next case.

## Matrix table columns

|| Column | Content |
||--------|---------|
|| **ID** | `HP-001`, etc. |
|| **Category** | Happy path / Race / Edge / Error |
|| **Case** | Short name |
|| **Preconditions** | Setup, route, mocks, seed data |
|| **Steps** | Numbered actions to perform |
|| **Expected** | Observable outcome |
|| **Status** | Checkbox token from table above |
|| **Notes** | Actual result, failure message, link to issue or fix run |

## Execution workflow

Copy and track progress:

```text
Test pass progress:
- [ ] Matrix file created and scoped
- [ ] HP cases executed and statuses updated
- [ ] RACE cases executed and statuses updated
- [ ] EDGE cases executed and statuses updated
- [ ] ERR cases executed and statuses updated
- [ ] Summary written (counts + open failures)
```

### Per-case loop

1. Read the row (preconditions → steps → expected).
2. Run the test (manual, scripted, or existing test runner).
3. Record pass/fail/blocked.
4. **Immediately** update the **Status** and **Notes** cells for that ID in `test_matrix_unit.md`.
5. If Status is `[!]`, classify the failure (see escalation).

## Failure classification

|| Failure type | Action |
||--------------|--------|
|| **Test/setup mistake** | Fix preconditions, mocks, or steps; re-run same ID |
|| **Spec gap** | Add or adjust matrix row; do not change product code without user ask |
|| **Code instability** | Escalate to `skill-implementer` for a single failure, or to `test-matrix-unit-recovery` for multiple related failures |
|| **Environment** | Mark `[~]`, note blocker, continue unrelated cases if possible |

**Code instability** means: correct preconditions and steps, expected behavior is agreed, but the product throws, corrupts state, races, or returns wrong data. Flaky behavior across re-runs also counts.

## Escalation to skill-implementer

When one or more cases fail due to **code instability**, open an isolated fix run — do not mix large product edits into the test matrix chat.

- **Single failure:** delegate directly to `skill-implementer` using the Task prompt below.
- **Multiple related failures, cross-layer failures, or batch recovery:** use [`test-matrix-unit-recovery`](../test-matrix-unit-recovery/SKILL.md) to switch to plan mode, batch the work, and delegate each batch to `skill-implementer`.

Use the **Task** tool:

```text
subagent_type: skill-implementer
```

Prompt must include:

1. **Failing IDs** — e.g. `RACE-002`, `ERR-001`
2. **Reproduction** — preconditions, steps, expected vs actual (from **Notes**)
3. **Scope** — files/layers implicated; ask implementer to fix only what failures require
4. **Return contract** — list fixed IDs and paths changed so the matrix owner can re-run failed cases

After implementer returns:

1. Set affected rows to `[ ]` (reset for re-test).
2. Re-run only those IDs.
3. Update Status and Notes again.

If the user named a project skill for the fix (e.g. `pixelanea-frontend-standards`), mention it in the Task prompt.

## Summary section (end of pass)

Append to `test_matrix_unit.md` after all cases are run or escalated:

```markdown
## Pass summary

| Metric | Count |
|--------|------:|
| Total | |
| Passed `[x]` | |
| Failed `[!]` | |
| Blocked `[~]` | |
| Skipped `[-]` | |
| Not run `[ ]` | |

### Open failures

- `ID` — one-line description (escalated / pending re-run)

### Escalations

- `{timestamp}` — skill-implementer — IDs: … — output: `.cursor/skill-outputs/...`
```

## Additional resources

- Matrix template: [test_matrix_unit.template.md](test_matrix_unit.template.md)
- Output layout: [skill-output-structure.mdc](../../rules/skill-output-structure.mdc)
- Product fixes: `.cursor/agents/skill-implementer.md`
- Batch recovery: [`test-matrix-unit-recovery`](../test-matrix-unit-recovery/SKILL.md)
