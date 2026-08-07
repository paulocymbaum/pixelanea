# Recursive Agent Loop Spec

How to use **recursive delegation** and **deterministic decision scripts** to run agent workflows until a defined completion condition is met — or until an iteration cap is reached.

This spec describes the Pixelanea Cursor harness. It is implementation-oriented: file layout, contracts, and orchestration steps.

---

## Problem

A single agent turn is unreliable for multi-step delivery:

- The model may stop early while work remains.
- Chat context resets between sessions.
- "Done" is subjective unless defined and checked mechanically.

**Solution:** a supervisor agent runs a bounded loop. After each worker run, a script reads persisted output and returns `continue` or `stop`. The supervisor delegates again only when the script says so.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Supervisor agent (orchestrator)                            │
│  - Materializes loop/ artifacts                             │
│  - Calls decision script after each worker run              │
│  - Delegates to worker when script returns continue         │
│  - Reports to user when script returns stop or cap hit      │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Task (delegate)               │ node/python script
               ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Worker agent            │    │  Decision script            │
│  - Executes a skill      │    │  - Reads last response file │
│  - Writes skill outputs  │    │  - Returns JSON decision    │
│  - Returns full response │    │  - Updates iteration state  │
└──────────────┬───────────┘    └─────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Persisted artifacts (.cursor/skill-outputs/...)            │
│  - Worker step files (investigation, plan, review, matrix)  │
│  - loop/last_agent_response.md (sensor for generic loops)   │
│  - loop/loop_iteration.json (iteration counter)             │
└─────────────────────────────────────────────────────────────┘
```

**Separation of concerns:**

| Layer | Responsibility | Must not |
|-------|----------------|----------|
| Supervisor | Loop lifecycle, delegation, user report | Implement product code directly |
| Worker | Skill workflow (investigate → deliver → review) | Decide whether another iteration is needed |
| Decision script | Parse artifacts, return structured continue/stop | Generate code or prose |
| `loop/check_condition.sh` | Domain-specific "done" rule for generic loops | Live in `.cursor/tools/` |

---

## Repository layout

```text
.cursor/
  agents/           # Orchestrator and worker agent definitions
  skills/           # Worker playbooks (SKILL.md per workflow)
  rules/            # Always-on constraints (paths, layer boundaries)
  tools/            # Decision scripts (loop_management.js, orchestrate_*.py)
  skill-outputs/    # All runtime artifacts from agent runs

docs/
  recursive-agent-loop-spec.md   # this file
```

### Token efficiency stack

| Layer | Tool | Config |
|-------|------|--------|
| Code read | graphify | `.cursor/rules/graphify.mdc`, `pnpm graphify:update` |
| Shell output | RTK | `rtk init -g --agent cursor` (global hook) |
| Prose | caveman | `.cursor/rules/caveman.mdc` |
| All layers | — | `.cursor/rules/pixelanea-token-efficiency.mdc` |

Setup: `pnpm agent-tools:setup`.

### Agent roles

| File | Task `subagent_type` | Role |
|------|----------------------|------|
| `agents/AGENT-recursive-implementer.md` | `AGENT-recursive-implementer` | Generic skill-delivery loop until review score passes |
| `agents/DEVELOPMENT-AGENT-skill-implementer.md` | `skill-implementer` | Worker: investigate → plan → implement → review |
| `agents/TEST-AGENT-unit-test-matrix-generator.md` | `TEST-AGENT-unit-test-matrix-generator` | Matrix loop until all cases pass |

### Decision scripts

| Script | Input | Use when |
|--------|-------|----------|
| `.cursor/tools/loop_management.js` | `loop/loop_config.json` + `last_agent_response.md` | Completion is checked by grep/bash on agent text |
| `.cursor/tools/orchestrate_unit_test_matrix.py` | `test_matrix_unit.md` | Completion is checked by matrix Status column |

Both scripts print a human banner on **stderr** and a JSON object on **stdout**. Orchestrators must parse stdout.

---

## Skill outputs (required persistence)

All deliverables and loop state live under `.cursor/skill-outputs/`. See `.cursor/rules/skill-output-structure.mdc` for the full catalog.

### Worker run folder

```text
.cursor/skill-outputs/{feature}/{layer}/{timestamp}_{skill-name}/
  01_investigation.md
  02_plan.md
  03_{step-slug}.md
  {NN}_code-review.md          # includes EVALUATION score 0–100
```

### Orchestration run folder (loops)

```text
.cursor/skill-outputs/orchestration/{feature}/{timestamp}_{orchestrator-name}/
  01_setup-loop.md               # optional setup notes
  loop/
    loop_config.json             # paths, cap, prompts
    check_condition.sh           # bash: exit 0 = done (generic loops only)
    stop_condition.md            # one-sentence definition of exit 0
    last_agent_response.md       # full worker output; overwritten each iteration
    loop_iteration.json          # written by loop_management.js
```

**Rule:** loop artifacts stay inside `loop/` under the run folder. Do not store loop state in `.cursor/tools/`, the repo root, or application source trees.

---

## Generic loop: `loop_management.js`

Use this pattern when "done" is defined on **text output** from the previous agent (scores, markers, phrases).

### Bash check contract

`loop/check_condition.sh` receives `RESPONSE_FILE` (alias `LOOP_RESPONSE_FILE`) pointing at `last_agent_response.md`.

| Exit code | Meaning | Orchestrator action |
|-----------|---------|---------------------|
| `0` | Done | Stop loop |
| non-zero | Not done | Continue loop |
| `2` | Misconfiguration (missing file) | Treat as error; fix artifacts |

Example checks:

```bash
# Explicit marker
grep -qE '^\s*STATUS:\s*complete\s*$' "${RESPONSE_FILE}" && exit 0

# Score threshold (recursive-implementer default)
score="$(grep -oE 'EVALUATION[^0-9]*[0-9]+' "${RESPONSE_FILE}" | grep -oE '[0-9]+$' | tail -1)"
[[ -n "${score}" && "${score}" -ge 95 ]] || exit 1
```

### `loop_config.json` fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | yes | Loop identifier |
| `check_script` | yes | Repo-relative path to `check_condition.sh` |
| `response_file` | yes | Repo-relative path to `last_agent_response.md` |
| `max_iterations` | no | Default `5` |
| `iteration_file` | no | Path to `loop_iteration.json` |
| `stop_reason` | no | Message when check exits 0 |
| `continue_reason` | no | Message when check exits non-zero |
| `next_prompt` | no | Default prompt for next worker (orchestrator may override) |

### Decision JSON (`loop_management.js` stdout)

| Field | Type | Meaning |
|-------|------|---------|
| `continue_loop` | boolean | `true` → delegate again; `false` → stop |
| `action` | `"continue"` \| `"stop"` | Same as above |
| `reason` | string | Why this decision was made |
| `iteration` | number | Current iteration (incremented on continue) |
| `max_iterations` | number | Cap from config |
| `check_exit_code` | number \| null | Bash script exit code |
| `prompt` | string \| null | Pass to next worker when continuing |

### Run command

```bash
node .cursor/tools/loop_management.js \
  --loop-config .cursor/skill-outputs/orchestration/{feature}/{ts}_recursive-implementer/loop/loop_config.json
```

Force stop at cap:

```bash
node .cursor/tools/loop_management.js \
  --loop-config path/to/loop/loop_config.json \
  --max-iterations-exceeded
```

### Orchestration algorithm

```
1. Materialize loop/ artifacts (first invocation only)
2. LOOP:
   a. Run loop_management.js
   b. If continue_loop is false → goto 3
   c. Task(worker, prompt) — build prompt from iteration number and last response
   d. Write full worker output to loop/last_agent_response.md
   e. Goto 2
3. Report to user: iterations used, stop reason, final score/artifacts
```

**Iteration cap:** when `iteration >= max_iterations`, the script returns `continue_loop: false` with `max_iterations_exceeded: true`. Report residual work; do not loop forever.

---

## Reference implementation: recursive skill delivery

`AGENT-recursive-implementer` is the canonical generic loop. It delegates to `skill-implementer` until delivery passes a review gate.

### Completion condition (default)

All must hold in `last_agent_response.md`:

1. `EVALUATION` score ≥ **95**, **or** line `STATUS: complete` is present
2. No unresolved **Critical** findings in the code-review Outcome (bash grep with negation allowances)

Override only when the user defines a different gate — document it in `stop_condition.md` and implement it in `check_condition.sh`.

### Worker stroke (each iteration)

`skill-implementer` always runs four steps:

1. **Investigate** → `01_investigation.md`
2. **Plan** → `02_plan.md`
3. **Implement** → `03_*.md` … (mark backlog In progress before coding)
4. **Code review** → `{NN}_code-review.md` with **EVALUATION** 0–100

### Prompt strategy

| Iteration | Prompt focus |
|-----------|--------------|
| 1 | Full skill path, user goal, output folder, request `STATUS: complete` when perfect |
| 2+ | Prior score, delivered summary, open Critical/Warnings; fix deltas only — do not restart unless investigation requires it |

Extract score and issues from `last_agent_response.md` before building iteration 2+ prompts.

### Anti-patterns

- Orchestrator implements product code instead of delegating
- Skip writing `last_agent_response.md` before running the decision script
- Report success to the user while `continue_loop` is still `true`
- Reverse bash semantics (exit 0 must mean **stop**)
- Add one-off loop logic to `loop_management.js` — put checks in `check_condition.sh`

---

## Domain-specific loop: test matrix orchestrator

When completion is defined by a **structured checklist** (not free text), use a dedicated Python decision script instead of bash grep.

`TEST-AGENT-unit-test-matrix-generator` reads `test_matrix_unit.md` via `orchestrate_unit_test_matrix.py`.

### Matrix Status column

| Token | Meaning |
|-------|---------|
| `[ ]` | Not run |
| `[x]` | Passed |
| `[!]` | Failed |
| `[~]` | Blocked |
| `[-]` | Skipped |

### Decision outcomes

| `decision` | When | Delegate to |
|------------|------|-------------|
| `run_test_matrix_unit` | No matrix, empty matrix, or cases still `[ ]` | `generalPurpose` + read `test-matrix-unit` skill |
| `delegate_skill_implementer` | Exactly one code failure | `skill-implementer` |
| `delegate_test_matrix_unit_recovery` | Multiple failures | `generalPurpose` + read `test-matrix-unit-recovery` skill |
| `report_complete` | All cases `[x]` or `[-]`, no open failures | None — report to user |

### Decision JSON (key fields)

| Field | Meaning |
|-------|---------|
| `call_subagent` | `true` → must Task immediately |
| `subagent_type` | Task enum value |
| `skill_path` | Skill file worker must read first |
| `prompt` | Verbatim delegation prompt |
| `case_ids` | Matrix rows in scope |

```bash
python3 .cursor/tools/orchestrate_unit_test_matrix.py \
  --feature qa --layer paint

python3 .cursor/tools/orchestrate_unit_test_matrix.py \
  --matrix-path .cursor/skill-outputs/qa/paint/{ts}_test-matrix-unit/test_matrix_unit.md
```

Same loop shape: run script → if `call_subagent` → delegate → persist matrix updates → repeat (max 5).

---

## Stacked loops (efficient ordering)

Run loops from **cheap self-check** to **expensive independent validation**:

```text
1. skill-implementer review gate     (EVALUATION ≥ 95, inner loop)
        ↓
2. unit test matrix                  (orchestrate_unit_test_matrix.py)
        ↓
3. Gherkin / E2E                     (qa-gherkin-run skill)
```

Inner loop (recursive-implementer) catches quality issues before outer loops spend time on full test execution. Case IDs should trace across contract → harness → matrix → Gherkin so each layer validates the same claims.

---

## Authoring a new loop

1. **Define done** in one sentence (`stop_condition.md`).
2. **Choose decision layer:**
   - Text/markers on agent output → `loop_management.js` + `check_condition.sh`
   - Structured file (matrix, JSON report) → dedicated Python script
3. **Pick worker** and skill (`skill-implementer`, test-matrix-unit, etc.).
4. **Materialize** run folder under `.cursor/skill-outputs/orchestration/.../loop/`.
5. **Set** `max_iterations` (default 5).
6. **Implement supervisor agent** or follow `loop-management` skill (`.cursor/skills/loop-management/SKILL.md`).
7. **Test** the bash check in isolation before running the full loop:

   ```bash
   RESPONSE_FILE=path/to/last_agent_response.md bash loop/check_condition.sh
   echo $?   # 0 = would stop, non-zero = would continue
   ```

Templates: `.cursor/skills/loop-management/check_condition.template.sh`, `loop_config.template.json`, `stop_condition.template.md`.

---

## Entry points

| Goal | Invoke | Decision script |
|------|--------|-----------------|
| Deliver a skill with auto-retry until review passes | `AGENT-recursive-implementer` | `loop_management.js` |
| Stabilize a unit test matrix | `TEST-AGENT-unit-test-matrix-generator` | `orchestrate_unit_test_matrix.py` |
| One-shot skill run (no loop) | `skill-implementer` | — |
| Custom loop | Follow `loop-management` skill | `loop_management.js` |

---

## Checklist (orchestrator implementation)

- [ ] `loop/` folder created under a skill-output run folder
- [ ] `loop_config.json` paths are repo-relative and contain no placeholders
- [ ] `check_condition.sh` is executable; exit 0 = done
- [ ] `stop_condition.md` states exit 0 in one sentence
- [ ] Worker output saved to `last_agent_response.md` before every script run
- [ ] Orchestrator parses JSON stdout, not stderr banner
- [ ] Delegation is automatic when `continue_loop` / `call_subagent` is true
- [ ] User report includes iteration count, stop reason, and residual issues
- [ ] Iteration cap honored; no infinite retry

---

## Related files

| Path | Purpose |
|------|---------|
| `.cursor/skills/loop-management/SKILL.md` | Step-by-step loop setup |
| `.cursor/agents/AGENT-recursive-implementer.md` | Recursive skill delivery orchestrator |
| `.cursor/agents/DEVELOPMENT-AGENT-skill-implementer.md` | Worker agent spec |
| `.cursor/rules/skill-output-structure.mdc` | Artifact path rules |
| `.cursor/tools/loop_management.js` | Generic loop decision script |
| `.cursor/tools/orchestrate_unit_test_matrix.py` | Matrix loop decision script |
