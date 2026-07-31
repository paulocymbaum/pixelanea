# UX flag rubric (qa-gherkin-run)

Maps [ux-seamless-flows](../ux-seamless-flows/SKILL.md) mistakes and practices to **red**, **yellow**, **green**, and **white** flags during Gherkin E2E execution.

Use this file when a scenario's functional result is ambiguous or when UX friction needs a separate flag from pass/fail.

---

## Flag definitions

| Flag | Symbol | Meaning |
|------|--------|---------|
| **Red** | 🔴 | **Ship blocker** — functional failure **or** UX mistake that blocks task completion, destroys trust, or leaves the user stuck with no recovery. |
| **Yellow** | 🟡 | **Friction / risk** — scenario functionally passes (or is flaky) but meaningful UX debt, inconsistency, or race sensitivity observed. Fix before wide release. |
| **Green** | 🟢 | **Healthy** — assertions pass and observable UX aligns with seamless-flow practices for this step. |
| **White** | ⚪ | **Neutral / N/A** — not run, skipped, unit-only, no user-visible surface, or informational note without pass/fail impact. |

**Rule:** Every executed scenario gets exactly one flag. Functional failure is always **red**, even if UX looked fine.

---

## Red flag — map from UX mistakes (blocking)

Assign **red** when any of these occur **during or after** the scenario steps:

| Mistake (#) | Red when… |
|-------------|-----------|
| 1 Unclear primary action | User cannot find or complete the main action; wrong CTA wins; task stalls |
| 2 Hidden system state | Save/sync/load state unknown; silent failure; no loading indicator on slow ops |
| 3 Breaking flow | Unsaved work lost; modal blocks with no cancel; navigation drops in-progress edits |
| 9 Accessibility (blocking) | Keyboard path broken, focus trap, no focus ring on critical control, unusable contrast on primary action |
| 10 Happy path only | Error/empty/loading path missing or dead-end with no exit |
| 12 No feedback loop | Action completes but user cannot tell success vs failure (export with no file, save with no indicator) |

Also **red** when:

- Any Gherkin `Then` assertion fails
- API returns error with no user-facing recovery and scenario expects recovery
- Data loss after reload/reopen when persistence was expected
- `@race` scenario fails without environment flake (document evidence)

---

## Yellow flag — friction and non-blocking debt

Assign **yellow** when **all `Then` clauses pass** but UX debt remains:

| Mistake (#) | Yellow when… |
|-------------|--------------|
| 4 Inconsistent patterns | Same action differs across screens but task still completable |
| 5 Cognitive overload | Too many choices on first visit; advanced noise on golden path |
| 6 Form friction | Extra fields, vague validation, small targets — but user can finish |
| 7 Weak hierarchy | Chrome competes with canvas; multiple elements same weight |
| 8 Jargon | Technical errors or internal terms shown; user can still guess next step |
| 11 Beauty without function | Decoration slows task or hides affordances slightly |

Also **yellow** when:

- `@race` or `@flaky` passes only with retry, throttle, or intentional delay
- EDGE case passes with confusing copy or surprising behavior (not wrong, but harsh)
- Partial practice gap (e.g. undo exists but no visible feedback)
- Matches **P1** from a sibling `uxui_design_critique.md` for the same feature

---

## Green flag — practices observed

Assign **green** when assertions pass **and** the scenario demonstrates relevant practices:

| Practice | Green signal (examples) |
|----------|-------------------------|
| Golden path | Shortest job completes without docs |
| One decision per step | Single clear question per screen |
| Progressive disclosure | Advanced options hidden until needed |
| Immediate feedback | Input responds <100ms perceived; toast on save |
| Forgiving | Undo works; cancel returns intact; autosave visible |
| Visual hierarchy | Primary action obvious; canvas hero ≥60% in editor |
| Flow continuity | Stable chrome; back/undo preserves context |
| Edge cases designed | Empty/loading/error states have exits |
| Accessibility | Focus visible; keyboard path works; reduced motion respected |
| Plain copy | Outcome verbs on buttons; errors say what to do next |

Use the [flow review checklist](../ux-seamless-flows/SKILL.md) at scenario end — if most items checked for this flow slice, prefer **green**.

---

## White flag — neutral / not assessed

Assign **white** when:

- Matrix row marked `unit-only`, `blocked`, or `deferred` in gherkin coverage table
- Scenario skipped (`[-]`) with documented reason
- Not run yet (`[ ]`)
- No browser-visible surface (pure domain/API-only assertion via harness)
- Informational observation (e.g. "Playwright spec not implemented — manual pass")
- Environment blocked (`[~]`) — dev stack down, missing fixture

**White is not a pass.** It means "no verdict" for that row.

---

## Combined decision flow

```text
Execute scenario
  ├─ Skipped / unit-only / not run / blocked? → WHITE
  ├─ Any Then failed? → RED
  ├─ All Then passed + blocking mistake (table above)? → RED
  ├─ All Then passed + friction mistake or flaky race? → YELLOW
  ├─ All Then passed + practices observable? → GREEN
  └─ All Then passed + no UX surface to judge → WHITE (note "functional-only")
```

---

## Scenario outcome table (report)

Per scenario in `qa_run_report.md`:

| Column | Content |
|--------|---------|
| Feature / Scenario | Gherkin title |
| Matrix IDs | From `# Matrix:` comment |
| Functional | pass / fail / skip |
| Flag | red / yellow / green / white |
| UX notes | Mistake # or practice; observable evidence |
| Evidence | Screenshot path, log line, selector, or API response id |

---

## Severity rollup (feature level)

After all scenarios:

| Rollup | Rule |
|--------|------|
| Feature **red** | Any scenario red on `@smoke` **or** ≥2 reds on same user job |
| Feature **yellow** | No red on smoke; any yellow on golden path |
| Feature **green** | All executed smoke + golden-path scenarios green |
| Feature **white** | Only white rows remain (nothing executed yet) |

Align with [UX.md](../../../UX.md) personas when tagging notes (Riley, Casey, Morgan, Alex).
