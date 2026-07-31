---
name: qa-gherkin-run
description: Executes Gherkin E2E scenarios from gherkin.md in .cursor/changelog/, records pass/fail, and classifies each scenario with red/yellow/green/white UX flags using ux-seamless-flows rubrics. Use when running QA E2E passes, validating changelog gherkin, triaging release readiness, or when the user asks for QA flags, Gherkin test execution, or E2E run reports after qa-e2e-gherkin.
---

# QA Gherkin Run

Execute **Gherkin scenarios** authored by `qa-e2e-gherkin` and produce a **flagged run report** grounded in [ux-seamless-flows](../ux-seamless-flows/SKILL.md).

**You run and judge scenarios** — you do not rewrite `gherkin.md` unless the user asks to fix specs.

---

## Quick start

1. **Locate `gherkin.md`** (priority order):
   - User-provided path
   - Latest under `.cursor/changelog/{feature}/*_qa-e2e-gherkin/gherkin.md`
   - Fallback: `.cursor/skill-outputs/{feature}/{layer}/*_qa-e2e-gherkin/gherkin.md` or sibling `*_test-matrix-unit/gherkin.md`

2. **Read** full gherkin — metadata, tags, matrix coverage, Playwright notes, all Features.

3. **Start stack** (unless user says services are already up):
   ```bash
   ./scripts/dev.sh --kill-stale
   ```
   Defaults: API `8787`, Vite `5173`.

4. **Materialize report** — copy [qa_run_report.template.md](qa_run_report.template.md) beside the gherkin:
   ```text
   .cursor/changelog/{feature}/{timestamp}_qa-e2e-gherkin/
     gherkin.md          # source (read-only)
     qa_run_report.md    # your deliverable
   ```
   If gherkin lives only under `skill-outputs/`, write `qa_run_report.md` in the same folder.

5. **Execute scenarios** in tag order: `@smoke` → HP flows → `@edge` → `@race` → `@error`.

6. **Update `qa_run_report.md` after each scenario** — never batch at end.

---

## Flag rubric (required)

Classify every scenario with exactly one flag using [flag-rubric.md](flag-rubric.md):

| Flag | When |
|------|------|
| 🔴 **Red** | `Then` fails **or** blocking UX mistake (unclear CTA, hidden state, lost work, no recovery, blocking a11y, no success feedback) |
| 🟡 **Yellow** | All `Then` pass but friction, inconsistency, jargon, flaky `@race`, or partial practice gap |
| 🟢 **Green** | All `Then` pass and seamless-flow practices observable for this step |
| ⚪ **White** | Skipped, unit-only, blocked env, not run, or no UX surface to judge |

Read [ux-seamless-flows](../ux-seamless-flows/SKILL.md) before the first `@smoke` scenario. Functional failure is always **red**.

---

## Execution modes

Pick the highest mode available; document which mode in report **Meta → Stack**.

### 1. Playwright (preferred when specs exist)

```bash
pnpm exec playwright test --grep @smoke   # when e2e/ exists
```

Map each `test()` to Gherkin Scenario via title or tags. On failure, capture trace/screenshot path in report.

### 2. Vitest QA harness (unit-adjacent matrix flows)

When gherkin coverage points to `apps/web/src/qa/`:

```bash
pnpm --filter web test src/qa/
```

Only counts for scenarios explicitly marked harness-eligible in gherkin **Matrix coverage** notes.

### 3. Manual guided (default when no automation)

For each scenario:

1. Set **Background** preconditions (new project, tool active, mocks per Playwright notes).
2. Perform **When** steps in the browser at `http://127.0.0.1:5173`.
3. Verify every **Then** — user-visible DOM, toast copy, reload persistence, dialog text.
4. **Observe UX** during steps (feedback timing, hierarchy, keyboard path) for flag assignment.
5. Record row in scenario results table immediately.

For `@race` scenarios, follow delay/mock instructions in gherkin **Playwright notes** (route interception, throttle). If scenario is `@flaky` without guidance, run twice — pass twice → yellow (flake risk), fail once → red.

### API verification

When gherkin asserts server state:

```bash
curl -s "http://127.0.0.1:8787/health"
```

Use OpenAPI-backed endpoints from `contracts/openapi.yaml` — never read SQLite directly ([pixelanea-core](../../rules/pixelanea-core.mdc)).

---

## Investigation before running

```bash
python3 .cursor/tools/search_frontend_elements.py --list-layers
python3 .cursor/tools/search_frontend_elements.py --layer pages
python3 .cursor/tools/search_frontend_elements.py --layer shell
```

Cross-check routes, labels, and `data-testid` against gherkin steps. If a step references a non-existent control, mark scenario **red** (spec drift) and note in **Escalations** → `qa-e2e-gherkin` regenerate.

Optional: read sibling `.cursor/changelog/{feature}/*_uxui-design-critique/uxui_design_critique.md` — P0 findings should bias toward red if reproduced; P1 toward yellow.

---

## Workflow checklist

```text
Run progress:
- [ ] gherkin.md located and read
- [ ] qa_run_report.md created
- [ ] Dev stack healthy
- [ ] @smoke scenarios executed
- [ ] Remaining tagged scenarios executed or marked white
- [ ] Flag rubric applied per scenario
- [ ] Feature rollup computed
- [ ] Escalations listed
```

---

## Escalations

| Condition | Delegate to |
|-----------|-------------|
| Single functional red on product bug | `skill-implementer` |
| Multiple reds or widespread flake | `test-matrix-unit-recovery` |
| Gherkin steps don't match app (spec drift) | `qa-e2e-gherkin` |
| Yellow/red UX-only, no functional fail | `uxui-design-critique` or user decision |
| Missing matrix / no gherkin | `test-matrix-unit` then `qa-e2e-gherkin` |

Do not patch production code during the run unless the user explicitly asked for fixes in this chat.

---

## Chat summary (after finishing)

1. Gherkin path and scenario counts by tag
2. Flag totals (red / yellow / green / white)
3. Feature rollup
4. Path to `qa_run_report.md`
5. Top 3 reds and top 3 yellows (one line each)
6. Recommended next step (fix code, regenerate gherkin, implement Playwright, UX critique)

---

## Rules

- **Never skip reading gherkin** — run only what is specified; honor unit-only rows as white.
- **Never assign green on functional fail** — fail is always red.
- **Update report per scenario** — same discipline as test-matrix-unit status cells.
- **Ground UX flags** in [flag-rubric.md](flag-rubric.md) and ux-seamless-flows — cite mistake # or practice name.
- **Persist under `.cursor/changelog/`** when gherkin is there; otherwise same folder as gherkin.
- UI never calls SQLite; persistence checks use reload, reopen, or HTTP GET.

---

## Additional resources

- Flag definitions and mistake mapping: [flag-rubric.md](flag-rubric.md)
- Report template: [qa_run_report.template.md](qa_run_report.template.md)
- UX source: [ux-seamless-flows](../ux-seamless-flows/SKILL.md)
