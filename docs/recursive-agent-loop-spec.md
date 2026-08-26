# Recursive Agent Loop Spec

How to use **recursive delegation** and **deterministic decision scripts** to run agent workflows until a defined completion condition is met — or until an iteration cap is reached.

This spec describes the Pixelanea Cursor harness. It is implementation-oriented: file layout, contracts, and orchestration steps.

---

## Problem

A single agent turn is unreliable for multi-step delivery:

- The model may stop early while work remains.
- Chat context resets between sessions.
- "Done" is subjective unless defined and checked mechanically.

**Solution:** a supervisor agent runs a bounded loop. After each worker run, `run_runners.sh` records CI step exits under `loop/runners/`, and a decision script returns `continue` or `stop` with an explicit `status` (`complete` | `continue` | `capped` | `interrupted`). Cap ≠ complete. The supervisor delegates again only when the script says so.

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
│  - Executes a skill      │    │  - Reads loop/runners JSON  │
│  - Writes skill outputs  │    │  - Returns JSON + status    │
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
| `.cursor/tools/loop_management.js` | `loop/loop_config.json` + `loop/runners/*.json` | Completion is checked by CI runner sensors (not agent prose) |
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
  {NN}_code-review.md          # CRITIC: PASS|FAIL (optional next-context; not stop bit)
```

### Orchestration run folder (loops)

```text
.cursor/skill-outputs/orchestration/{feature}/{timestamp}_{orchestrator-name}/
  01_setup-loop.md               # optional setup notes
  loop/
    loop_config.json             # paths, cap, prompts, harness_profile
    check_condition.sh           # bash: exit 0/1/2 from loop/runners/
    stop_condition.md            # one-sentence definition of exit 0
    last_agent_response.md       # critic/context; overwritten each iteration — not the sensor
    loop_iteration.json          # written by loop_management.js
    runners/                     # written only by run_runners.sh / check helper
      lint.json
      unit.json
      e2e.json                   # Deliver profile only
      summary.json
      logs/
```

**Rule:** loop artifacts stay inside `loop/` under the run folder. Do not store loop state in `.cursor/tools/`, the repo root, or application source trees.

---

## Generic loop: `loop_management.js`

Use this pattern when "done" is defined on **plant sensors** under `loop/runners/` (CI step exits). `last_agent_response.md` is critic/context only.

### Develop vs Deliver

| Profile | Required runners | Commands |
|---------|------------------|----------|
| **Develop** (recursive-implementer default) | `lint.json`, `unit.json` | `./scripts/ci.sh 03-lint`, `04-typecheck`, `06-test-unit` (+ `09-test-backend-unit` when `server/` in scope) |
| **Deliver** (QA gate) | + `e2e.json` | `./scripts/ci.sh e2e` (or `e2e-nightly`) |

Sensor catalog: [scripts/ci-steps/README.md](../scripts/ci-steps/README.md).

### Bash check contract

`loop/check_condition.sh` reads `loop/runners/*.json` (via `check_runner_gate.js`). It must **ignore** `EVALUATION`, `STATUS: complete`, and critic phrases in `RESPONSE_FILE`.

| Exit code | Meaning | `status` | Orchestrator action |
|-----------|---------|----------|---------------------|
| `0` | Required runners green | `complete` | Stop loop |
| `1` | At least one required runner red | `continue` | Continue loop |
| `2` | Misconfiguration (missing `runners/`, bad JSON) | `interrupted` | Stop; fix artifacts |

Preferred split: `run_runners.sh` writes JSON (timeout lives there); `check_condition.sh` only reads.

### `loop_config.json` fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | yes | Loop identifier |
| `check_script` | yes | Repo-relative path to `check_condition.sh` |
| `response_file` | yes | Repo-relative path to `last_agent_response.md` |
| `max_iterations` | no | Default `5` — cap → `status: capped`, never complete |
| `iteration_file` | no | Path to `loop_iteration.json` |
| `harness_profile` | no | `develop` or `deliver` |
| `auto_run_runners` | no | Invoke `run_runners.sh` when summary is stale |
| `include_backend` | no | Fold backend unit into `unit.json` |
| `stop_reason` | no | Message when check exits 0 |
| `continue_reason` | no | Message when check exits 1 |
| `next_prompt` | no | Default prompt for next worker (orchestrator may override) |

### Decision JSON (`loop_management.js` stdout)

| Field | Type | Meaning |
|-------|------|---------|
| `continue_loop` | boolean | `true` → delegate again; `false` → stop |
| `status` | `"complete"` \| `"continue"` \| `"capped"` \| `"interrupted"` | Exit class |
| `action` | `"continue"` \| `"stop"` | Same as continue_loop |
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

**Iteration cap:** when `iteration >= max_iterations`, the script returns `continue_loop: false` with `status: "capped"` and `max_iterations_exceeded: true`. Cap ≠ complete — report residual red runners; do not loop forever.

---

## Reference implementation: recursive skill delivery

`AGENT-recursive-implementer` is the canonical Develop loop. It delegates to `skill-implementer` until **CI runners** are green.

### Completion condition (default)

Required files under `loop/runners/` must be green:

1. `lint.json` exit 0
2. `unit.json` exit 0
3. (Deliver only) `e2e.json` exit 0

`{NN}_code-review.md` critic (`CRITIC: PASS|FAIL`) is optional context for the next stroke. `loop/last_agent_response.md` is **not** the sensor.

Override only when the user defines a different gate — document it in `stop_condition.md` and implement it in `check_condition.sh`.

### Worker stroke (each iteration)

`skill-implementer` always runs four steps:

1. **Investigate** → `01_investigation.md`
2. **Plan** → `02_plan.md`
3. **Implement** → `03_*.md` … (mark backlog In progress before coding)
4. **Code review** → `{NN}_code-review.md` with **CRITIC: PASS|FAIL**

### Prompt strategy (continue pack order)

| Iteration | Prompt focus |
|-----------|--------------|
| 1 | Full skill path, user goal, output folder; remind that runners (not EVALUATION) are the stop bit |
| 2+ | Setpoint → `summary.json` → failing log tails → optional CRITIC notes; fix deltas only |

Do not lead continuation prompts with a numeric EVALUATION.

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
1. Develop runners (lint + unit)     (recursive-implementer inner loop)
        ↓
2. unit test matrix                  (orchestrate_unit_test_matrix.py)
        ↓
3. Deliver / Gherkin E2E             (qa-gherkin-run / Playwright)
```

Inner loop (recursive-implementer) uses cheap CI step sensors before outer loops spend time on Playwright. Matrix Status cells remain the matrix orchestrator's input — agent `[x]` is not lint/unit green. Case IDs should trace across contract → harness → matrix → Gherkin so each layer validates the same claims.

---

## Authoring a new loop

1. **Define done** in one sentence (`stop_condition.md`).
2. **Choose decision layer:**
   - CI runners under `loop/runners/` → `run_runners.sh` + `loop_management.js` + `check_condition.sh`
   - Structured file (matrix, JSON report) → dedicated Python script
3. **Pick worker** and skill (`skill-implementer`, test-matrix-unit, etc.).
4. **Materialize** run folder under `.cursor/skill-outputs/orchestration/.../loop/` (including `runners/`).
5. **Set** `max_iterations` (default 5) and `harness_profile` (`develop`|`deliver`).
6. **Implement supervisor agent** or follow `loop-management` skill (`.cursor/skills/loop-management/SKILL.md`).
7. **Test** the gate with fixture JSON (no product build required):

   ```bash
   node .cursor/tools/check_runner_gate.test.js
   # or:
   node .cursor/tools/check_runner_gate.js --runners-dir path/to/loop/runners
   echo $?   # 0 = complete, 1 = continue, 2 = interrupted
   ```

Templates: `.cursor/skills/loop-management/check_condition.template.sh`, `run_runners.template.sh`, `loop_config.template.json`, `stop_condition.template.md`.

---

## Entry points

| Goal | Invoke | Decision script |
|------|--------|-----------------|
| Deliver a skill with auto-retry until Develop runners pass | `AGENT-recursive-implementer` | `loop_management.js` + `run_runners.sh` |
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
