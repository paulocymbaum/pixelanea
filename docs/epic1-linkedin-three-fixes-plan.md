# Epic 1 LinkedIn rewrite plan — three fixes

> **Superseded for full Epic 1 ship:** use [`docs/epic1-linkedin-five-fixes-plan.md`](./epic1-linkedin-five-fixes-plan.md) (adds packaging spine + wiring cut). Keep this file as the detailed edit map for metaphor / CTA / proof sub-steps.

**Target file:** `docs/loop-engineering-control-loop-linkedin.md`  
**Scope:** Metaphor pile-up, weak CTA, proof asserted. Do not mix in the other review items yet (length cut, wiring section split) unless they collide.

---

## Fix order (do in this sequence)

1. **Proof inventory** (blocked on facts — gather before rewrite)  
2. **Metaphor diet** (edit-only)  
3. **Close rewrite** (proof stance + single CTA together — same ending block)

Reason: CTA and “did it work?” share the same closing section. Metaphor cuts touch mid-article and must stay consistent with whatever proof language you choose (testing vs held).

---

## 1. Metaphor pile-up → one metaphor + one mapping table

### Keep
- **Primary metaphor:** thermostat / closed-loop room temperature (already in “You already know closed-loop control” and the open-loop “room swinging” beat).
- **Core loop sentence:** Measure → compare to setpoint → correct → measure again.
- **Mapping vocabulary** used as *labels*, not new scenes: setpoint, sensor, error, actuator, controller.

### Cut or demote (do not introduce new physical worlds)

| Current device | Action |
|----------------|--------|
| Cruise control | **Cut** — same lesson as thermostat; one example is enough. |
| Blasting AC / leaving house | **Keep one line** as open-loop contrast under thermostat, or fold into open-loop section — not a third scene. |
| Plant / reference signal / oscillation | **Keep lightly** — “plant” = the app under control is useful once; drop “reference signal” jargon or replace with “the contract is the target.” |
| Rails / craftsmen / foremen / governor | **Cut metaphors**; keep the *roles* in plain English (rules, worker steps, supervisor, review gate). |
| Strain gauges / process charts / flight instruments | **Replace with plain names:** fast tests · matrix checklist · E2E. Optional one-line “inner vs outer loop” — no refinery. |
| Cascade control / refinery | **Cut entirely.** |
| Anti-windup | **Keep as one gloss** (“iteration cap = stop forcing the motor when error won’t shrink”) or drop the control-theory name and say “cap retries.” |
| Nervous system / mountain | **Cut** from the lessons list; say “harness simulates a user click.” |

### Add: one mapping table (place after “The loop: measure, compare, correct”)

```markdown
| Control term | In this harness |
|--------------|-----------------|
| Setpoint | Done definition: tests green, review threshold, stop script says stop |
| Sensor | Harness / matrix / E2E artifacts outside chat |
| Error | Failed cases, open findings, residual after a pass |
| Actuator | The LLM (writes code, proposes fixes) |
| Controller | Bash/Node scripts that return continue or stop |
```

Rule for the rest of the draft: **if a sentence needs a new metaphor to explain the table, rewrite the sentence — do not add a metaphor.**

### Section-level edit map

| Section | Edit |
|---------|------|
| Open loop… | Keep room-swinging; remove any urge to add cars/plants here. |
| You already know… | Thermostat only. Delete cruise-control paragraph. Keep one open-loop “blast AC” line max. |
| Chaotic plant | Rename heading to something like “A multi-stack app is a bad open loop” or keep “plant” once. Replace “reference signal” with “written target / contract.” Keep oscillation as plain “swings / regresses.” |
| The loop… | Keep definitions + **insert mapping table**. Keep Mermaid for now (separate review item) or swap for table-only if publishing soon. |
| Wiring the plant… | Strip craftsmen/foremen/governor language; plain roles. (Full cut of section = other review item; for this fix, metaphor-only.) |
| Spec first… | Drop “cascade control’s inner loop” metaphor; say “cheap local check before expensive QA.” |
| Fast sensors… | Retitle to “Three kinds of measurement” (or similar). Bullet: unit harness / matrix / E2E. Delete strain gauges, process charts, flight instruments, refinery paragraph. |
| Lessons list | Remove nervous-system / mountain / anti-windup jargon; keep the rule in plain words. |
| Did it work? | No new metaphors. |

**Done when:** reader meets exactly one physical analogy (thermostat) and one table; every other explanation is role/name of a real artifact.

---

## 2. Weak CTA → one ask + one link

### Decisions to lock before editing

| Decision | Recommendation |
|----------|----------------|
| Primary audience | Builders burned by agent thrash (matches thesis) |
| Single ask | **Comment** with your stop condition *or* **star/clone** the repo — pick **one**. Prefer comment for LinkedIn algorithm; put repo link as the destination for the curious. |
| Single link | `https://github.com/paulocymbaum/pixelanea` (or releases page if you want “try the app” — then say that explicitly). |
| Hashtags | **Delete** the `#SoftwareEngineering…` line. |

### Rewrite the ending block (lines 187–201)

Replace “Did it work?” + bio + hashtags with this shape:

1. **Proof-aligned close** (from Fix 3 — testing stance or measured result).  
2. **One sentence takeaway** (already have: motor vs pilot).  
3. **CTA block (exactly one primary):**

```markdown
**Try it / steal the pattern:** Pixelanea is open source — [github.com/paulocymbaum/pixelanea](https://github.com/paulocymbaum/pixelanea).

**One ask:** In the comments, drop the one sentence you would use as a stop condition for your next agent run. If you don’t have one, that’s the bug.
```

If you prefer product CTA over engagement CTA:

```markdown
**One ask:** Clone or grab a Linux build from the repo and run the blank-project flow once — then tell me where the loop still felt open.
Repo: https://github.com/paulocymbaum/pixelanea
```

Do not use both “comment” and “clone” as co-equal asks. Secondary link can live in the bio line only.

### Soft CTA earlier (optional, max one)

First mention of Pixelanea (line 9): add the same repo URL once as a parenthetical link so skimmers who bounce still have a destination. Do not add mid-article CTAs.

**Done when:** zero hashtags; exactly one imperative ask; exactly one primary URL.

---

## 3. Proof asserted → evidence or humility (pick a stance)

### Stance choice (required)

| Option | When to use | Close language |
|--------|-------------|----------------|
| **A — Still testing** | You lack before/after numbers or a documented failure | Match subtitle: hypothesis under test; “early signal,” not “held.” |
| **B — Measured result** | You can publish at least one baseline comparison or one residual-error story | Soft “held for this plant” + show the numbers/story. |

**Default recommendation:** **A**, unless you spend a short evidence pass and find real numbers. Declaring victory without data is the current bug.

### Evidence inventory (do before rewriting “123 cases”)

Gather into a small scratch note (not necessarily published raw):

| Claim today | Replace with | Where to look |
|-------------|--------------|---------------|
| “123 fast-sensor cases” | Exact count from current Vitest/matrix IDs **or** drop the number | `apps/web` `*.test.*`, skill-output matrices, `sync_paint_matrix_status` outputs |
| “hypothesis held” | Option A language **or** Option B with a table | Honest judgment after inventory |
| “agents that did not run open-loop” | “agents gated by a continue/stop script” (mechanism) + one example | `HARNESS.md`, a real `loop/` run with stop |
| Convergence / five passes | One real loop: start red → N passes → green **or** hit cap with residual | Changelog / skill-outputs / PR history for a frame-sync or matrix recovery |

**Minimum publishable proof (pick ≥1):**

1. **Worked example with friction** — Expand “One disturbance, one correction cycle” with concrete IDs: case name, fail → review below threshold → second pass → green; or fail → hit iteration cap → human fix. Prefer an ending that is not perfectly clean.  
2. **Tiny metrics table** (only if true):

```markdown
| Signal | Before loop harness | After |
|--------|---------------------|-------|
| Stop decision | Human reading chat | Script on artifacts |
| Paint/file/import/animation harness cases | N | M |
| Example recovery | — | Case X: 2 passes to green |
```

If “before” is unknown, **do not invent it**. Use a single-column “what exists now” list instead of a fake A/B.

### Edit map for proof language

| Location | Change |
|----------|--------|
| Subtitle `testing a hypothesis` | **Keep** if Option A; if Option B, change to “a field test on one codebase” (still not “proof”). |
| Line 155 (“We ran 123… four depths of proof”) | Replace “proof” with “checks.” Replace 123 with verified count or “a three-digit harness across …” only if counted. Prefer: “harness cases for paint, file I/O, import, and animation, each ID-linked to matrix rows.” |
| “One disturbance…” | Add 3–6 concrete sentences (case ID, what stayed red, what the controller did). This becomes the emotional proof. |
| “Did it work?” | **Rewrite entirely:** |
| | Option A: “Too early to crown the hypothesis. What I can say: Pixelanea shipped with an explicit stop path; open-loop thrash got rarer on the paths we instrumented. Next: measure override rate and time-to-green.” |
| | Option B: “On this plant, the interesting result was not zero bugs — it was that residual error showed up as matrix rows and stop scripts instead of midnight vibes.” + table or failure story. |
| “The hypothesis held” | **Delete** under Option A. Under Option B, demote to “held well enough to ship this app” immediately followed by evidence. |

**Done when:** no sentence claims victory the subtitle still calls a test; every number is counted or removed; at least one concrete imperfect loop story sits above the CTA.

---

## Combined closing sketch (Option A + CTA)

Use as the target shape when editing the end:

```markdown
## What I can claim so far

Pixelanea shipped — desktop app, bundles, animation — with agents behind a continue/stop script, not vibes.

I am not declaring the hypothesis settled. I am saying open-loop thrash got rarer on the paths we instrumented, and residual error showed up as red matrix rows and capped retries instead of “the model said it was done.”

Power without feedback is still noise. Build the sensors first. Write the comparator in bash. Let the agent be the motor, not the pilot.

---

Pixelanea is open source: https://github.com/paulocymbaum/pixelanea

**One ask:** Comment the one-sentence stop condition you would use on your next agent run.
```

---

## Acceptance checklist

- [ ] Only thermostat as extended metaphor; one mapping table present  
- [ ] No cruise / refinery / strain gauge / craftsmen / flight-instrument language  
- [ ] “123” verified or removed; “proof” softened; “hypothesis held” gone or evidence-backed  
- [ ] “One disturbance” includes a concrete imperfect cycle  
- [ ] Hashtags gone; one ask; one primary link  
- [ ] Subtitle and close agree (testing vs measured)

## Out of scope for this plan

Full length cut, deleting “Wiring the plant,” Mermaid → PNG, media series calendar — track separately so this pass stays shippable.
