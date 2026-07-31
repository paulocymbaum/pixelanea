---
name: test-matrix-unit-recovery
description: Recovery orchestrator for test-matrix-unit. When one or more matrix cases fail after test-matrix-unit, switches to plan mode, batches the failing cases by layer and dependency, and delegates each batch to skill-implementer to deliver the required fixes. Re-runs the matrix after each batch and updates statuses.
---

# Test Matrix Unit Recovery

Recovery orchestrator that follows `test-matrix-unit`. Use this skill when a test pass produced failed or blocked cases that require product changes to resolve.

## When to use

Run this skill immediately after `test-matrix-unit` when:

- One or more cases have Status `[!]` (failed) or `[~]` (blocked) due to code instability
- The failures span multiple layers, files, or root causes and need to be tackled in batches
- The user wants the failing cases fixed and the matrix re-run systematically

## Goal

Convert failed test-matrix-unit cases into passing cases by planning recovery work in batches and delegating each batch to `skill-implementer`.

## Input

Read the most recent matrix output from `test-matrix-unit`:

```text
.cursor/skill-outputs/{feature}/{layer}/{timestamp}_test-matrix-unit/test_matrix_unit.md
```

Identify every row with Status `[!]` or `[~]` whose root cause is **code instability** or **missing implementation** (not test setup mistakes, spec gaps, or pure environment blockers).

## Workflow

### Step 1 — Enter plan mode

Use the **SwitchMode** tool with `target_mode_id: plan`. Explain that the remaining failures need a recovery plan before any code changes.

### Step 2 — Group failures into batches

Create small, coherent batches of related failures. Prefer grouping by:

- **Layer/domain** — frontend, backend, domain, db, export, image
- **Dependency order** — fixes that unblock other cases first
- **Shared root cause** — same bug, same component, same broken precondition

Aim for **1–3 related failures per batch** so each batch is reviewable and testable in isolation.

For each batch, record:

- Batch ID (e.g., `batch-01`, `batch-02`)
- Failing case IDs
- Shared root cause or dependency rationale
- Files/layers implicated
- Acceptance criteria: the listed case IDs must pass after the batch

### Step 3 — Plan each batch

Create the recovery output folder:

```text
.cursor/skill-outputs/{feature}/{layer}/{timestamp}_test-matrix-unit-recovery/
```

Write `01_plan.md` with:

| Segment | Content |
|---------|---------|
| **Goal** | One sentence: recover the failing cases by fixing the underlying code. |
| **Batches** | Numbered list. Each batch shows its ID, case IDs, root cause, scope, and acceptance criteria. |
| **Files** | Paths expected to change (summary, no code dumps). |

Share the batch plan briefly in chat, then proceed to delegation unless the user explicitly asked to approve the plan first.

### Step 4 — Delegate each batch to skill-implementer

For every batch, call the **Task** tool:

```text
subagent_type: skill-implementer
```

The prompt must include:

1. **Skill context** — reference `test-matrix-unit` and any relevant project skill (e.g., `pixelanea-frontend-standards`, `pixelanea-cpp-standards`)
2. **Batch ID and failing case IDs**
3. **Reproduction** — preconditions, steps, expected vs actual (copied from the matrix **Notes**)
4. **Scope** — files/layers to change; ask the implementer to fix only what the batch requires
5. **Return contract** — list fixed IDs, paths changed, and whether the cases are ready for re-test

Use one step file per batch under the recovery output folder:

```text
02_batch-01_implementer.md
03_batch-02_implementer.md
...
```

Each file records the delegation, the implementer's return summary, and any follow-up needed.

### Step 5 — Re-run the matrix

After each batch returns:

1. Reset the affected rows to `[ ]` in the original `test_matrix_unit.md`
2. Re-run **only** the case IDs in that batch
3. Update **Status** and **Notes** immediately after each re-run
4. If a batch did not fully resolve its cases, create a follow-up batch with the remaining failures and re-delegate to `skill-implementer`

### Step 6 — Finalize

When all cases are `[x]` (passed), `[-]` (skipped), or `[~]` (blocked for environment reasons only), append a **Recovery summary** to the original `test_matrix_unit.md`:

```markdown
## Recovery summary

| Metric | Count |
|--------|------:|
| Total failed originally | |
| Resolved by recovery | |
| Still open | |

### Batches delegated

- `{timestamp}` — batch-01 — IDs: ... — output: `.cursor/skill-outputs/...`
- `{timestamp}` — batch-02 — IDs: ... — output: `.cursor/skill-outputs/...`

### Paths changed

- `path/to/file` — summary of change
```

Then switch back to **agent** mode with SwitchMode if the conversation is still in plan mode.

## Output structure

```text
.cursor/skill-outputs/{feature}/{layer}/{timestamp}_test-matrix-unit-recovery/
01_plan.md
02_batch-01_implementer.md
03_batch-02_implementer.md
...
NN_summary.md
```

## Rules

- Never patch product code inline in the test matrix chat; always route fixes through `skill-implementer`
- Batch by layer and dependency, not by arbitrary splitting
- Re-run only the affected case IDs after each batch returns
- If a batch fails to resolve its cases, escalate back to `skill-implementer` with the new failure notes
- Respect dependency direction in `pixelanea-core.mdc`
- Do not create a new test matrix file; update the existing `test_matrix_unit.md`
