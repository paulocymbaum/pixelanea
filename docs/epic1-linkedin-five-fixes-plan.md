# Epic 1 LinkedIn rewrite plan — five fixes

**Target (conversion core):** `docs/loop-engineering-control-loop-linkedin.md`  
**Companion (Part 2 destination):** `docs/recursive-agent-loop-spec.md` (link only; do not rewrite unless gaps block the tease)  
**Media package:** `docs/linkedin-media-assets.md` + `docs/media/linkedin/`  
**Supersedes scope of:** `docs/epic1-linkedin-three-fixes-plan.md` (reuse its edit maps; this plan adds packaging + wiring cut)

**Primary audience (locked):** builders burned by agent thrash (Cursor / multi-agent coding).  
**Not primary:** general “AI tips” scrollers, hiring managers scanning for Pixelanea demos alone.

---

## Outcome

One LinkedIn-ready **essay** that teaches closed-loop agent engineering, plus a **content spine** that makes product GIFs serve the thesis instead of competing with it. Reader finishes with: one model, one imperfect proof story, one stealable stop rule, one ask, one link — and a promise of Part 2 for harness internals.

**Publish gate:** subtitle and close agree; no victory without evidence; metaphor count = 1 scene + 1 table; no harness wiring in Part 1; media calendar exists before GIF posts go live.

---

## Fix order (do in this sequence)

| Step | Fix | Why this order |
|------|-----|----------------|
| 0 | **Lock decisions** (stance, CTA ask, series shape) | Avoid rewriting twice |
| 1 | **Proof inventory** | Blocks close language and “123” / “held” edits |
| 2 | **Cut “Wiring the plant” → Part 2 tease** | Biggest length/completion win; frees metaphor diet |
| 3 | **Metaphor diet** + mapping table | Edit remaining body only |
| 4 | **Spine / packaging** (article bridge + media calendar + captions) | Essay and GIFs must share one job story |
| 5 | **Close rewrite** (proof stance + CTA + series promise) | Same ending block; last so numbers/stance are real |

Do not ship Part 1 until steps 1–5 pass the acceptance checklist below.

---

## Locked decisions (fill before editing)

| Decision | Recommendation | Owner fills |
|----------|----------------|-------------|
| Proof stance | **A — Still testing** unless inventory yields ≥1 real metric or residual-error story | **A** (locked) |
| Single CTA ask | **Comment** your one-sentence stop condition (algorithm-friendly) | **Comment** (locked) |
| Single primary link | `https://github.com/paulocymbaum/pixelanea` | **`https://github.com/pixelanea/pixelanea`** (README canonical) |
| Series shape | **Epic 1a–1c product posts → 1d essay → 1e Part 2 (wiring)** | **Locked** |
| Part 2 home | LinkedIn follow-up *or* link to published `recursive-agent-loop-spec` / gist | **Both:** tease + link to `docs/recursive-agent-loop-spec.md` |
| Mermaid | Replace with **one static PNG** (or table-only) before publish — track as sub-task of step 3 | **Table-only** (locked) |

---

## 1. Proof asserted → evidence or humility

### Stance

| Option | When | Close language |
|--------|------|----------------|
| **A — Still testing** | No before/after, no documented failure | Match subtitle; “early signal,” never “held” |
| **B — Measured on this plant** | ≥1 baseline comparison **or** one residual-error story with IDs | Soft “held well enough to ship” + evidence in same breath |

**Default: A.** Declaring victory without data is the current bug.

### Evidence inventory (block rewrite of numbers until done)

Scratch note (can live under `.cursor/skill-outputs/product/content/…/proof-inventory.md`):

| Claim today | Replace with | Where to look |
|-------------|--------------|---------------|
| “123 fast-sensor cases” | Exact Vitest/matrix count **or** drop the integer | `apps/web` tests, matrix skill-outputs |
| “hypothesis held” | A language **or** B + table/story | Inventory judgment |
| “agents that did not run open-loop” | “gated by continue/stop script” + one real `loop/` example | `HARNESS.md`, skill-outputs `loop/` |
| Five-pass anti-windup | One real loop: red → N passes → green **or** hit cap with residual | Changelog / recovery runs / PRs |

**Minimum publishable proof (pick ≥1):**

1. **Imperfect worked example** — Expand “One disturbance…” with case ID, what stayed red, controller action, second pass or cap+human. Prefer not perfectly clean.
2. **Tiny metrics table** — only if true; if “before” unknown, single-column “what exists now” (no fake A/B).

### Edit map

| Location | Change |
|----------|--------|
| Subtitle `testing a hypothesis` | Keep for A; for B → “a field test on one codebase” |
| “123… four depths of proof” | Soften “proof” → “checks”; verify count or drop integer |
| “One disturbance…” | +3–6 concrete sentences (emotional proof) |
| “Did it work?” / “hypothesis held” | Rewrite per A or B (see closing sketch) |

**Done when:** subtitle and close agree; every number counted or removed; ≥1 imperfect loop story above CTA.

---

## 2. Two products, no spine → one job story across surfaces

### Problem

Essay job = teach the loop. GIF job today = show a cute editor. Feed viewers never meet the thesis; essay readers barely meet the product.

### Spine (locked narrative)

> Pixelanea is the **app under control** (the thing that breaks when the loop is open). The GIFs are **what the plant looks like when sensors can tell truth**. The essay is **how the feedback path is built**.

One sentence bridge, reused in essay intro + every GIF caption:

> “This is the desktop plant I closed the loop on — local pixel editor, no cloud to hide behind.”

### Content calendar (Epic 1 distribution)

| Slot | Asset | Post job (one only) | Caption must include |
|------|-------|---------------------|----------------------|
| **1a** | `blank-project.gif` | Show plant: blank → paint → save | Bridge sentence + “sensors care that save actually sticks” |
| **1b** | `import-capybara.gif` | Show plant: import path | Bridge + “contract/wizard = written target before agents touch UI” (one line max) |
| **1c** | `animation-walk.gif` | Show plant: frames sync | Bridge + tease “frame sync is where open loop bites” |
| **1d** | Essay | Teach loop + one disturbance | Link repo; promise Part 2; do **not** re-demo all GIF flows |
| **1e** | Part 2 | Wiring / harness | Link `recursive-agent-loop-spec` or excerpt |

**Rules:**

- Do **not** attach all three GIFs to the essay as decoration. Essay gets at most **one** inline still (prefer onboarding still *or* a red-matrix / stop-script screenshot if you have it — proof > polish).
- GIF posts publish **before** or **with** 1d, never as unexplained orphans after.
- Update `docs/linkedin-media-assets.md` “Suggested LinkedIn usage” table with the caption hooks above and the 1a→1e order.

### Article-side bridge (Part 1 intro)

After first Pixelanea mention (~line 9), add 1–2 sentences:

- What the reader will see in the feed clips (plant).
- That this article is the control path, not a feature tour.
- “Harness wiring = Part 2.”

**Done when:** a stranger reading only 1a caption still knows this is about closed-loop building; a stranger reading only the essay knows the GIFs exist as plant proof, not a second product pitch.

---

## 3. Metaphor inflation → one metaphor + one mapping table

Reuse the cut table from `epic1-linkedin-three-fixes-plan.md` §1.

### Keep

- **One scene:** thermostat / room swinging (open vs closed).
- **Loop sentence:** Measure → compare to setpoint → correct → measure again.
- **Labels only (not new worlds):** setpoint, sensor, error, actuator, controller.

### Cut

Cruise control · craftsmen/foremen/governor · strain gauges/process charts/flight instruments · cascade/refinery · nervous system/mountain.  
“Plant” at most once as “the app under control.” “Anti-windup” → plain “iteration cap” (optional one gloss).

### Add (after “The loop: measure, compare, correct”)

```markdown
| Control term | In this harness |
|--------------|-----------------|
| Setpoint | Done definition: tests green, review threshold, stop script says stop |
| Sensor | Harness / matrix / E2E artifacts outside chat |
| Error | Failed cases, open findings, residual after a pass |
| Actuator | The LLM (writes code, proposes fixes) |
| Controller | Bash/Node scripts that return continue or stop |
```

**Rule:** if a sentence needs a new metaphor to explain the table, rewrite the sentence.

**Done when:** reader meets exactly one physical analogy + one table.

---

## 4. “Wiring the plant” → Part 2 (out of conversion core)

### Cut from Part 1

Delete (or reduce to ≤3 sentences + link) the section **“Wiring the plant: rails, workers, and foremen”** (current ~lines 92–108).

That material already belongs in `docs/recursive-agent-loop-spec.md`. Part 1 must not require knowing Cursor Rules / Skills / supervisor agents.

### What stays in Part 1 (roles without wiring)

In “The loop…” or the disturbance story, keep **plain** facts only:

- Scripts return continue/stop.
- Workers may self-review; they do not decide done.
- Spec/contract is the written target.

No rails/craftsmen/foremen scene.

### Part 2 tease (end of body, before close)

```markdown
## Part 2 (next)

How the harness is wired — rules as rails, worker investigate→develop→review, supervisor loop, and the bash continue/stop check — lives in the recursive agent loop spec and a follow-up post. This article stops at the control model and one real disturbance.
```

Link the spec (or a public gist) so curious readers exit cleanly instead of bouncing mid-essay.

### Optional compress of “Spec first…” / “Fast sensors…”

After the wiring cut, if still >~1,400 words:

- Fold “Spec first…” into 1 short paragraph + pointer to Part 2.
- Retitle “Fast sensors…” → “Three kinds of measurement”; bullets only (unit / matrix / E2E).

Target Part 1: **~900–1,200 words** after cuts (stretch to ~1,400 only if disturbance story needs space).

**Done when:** Part 1 readable without Cursor harness literacy; Part 2 destination explicit.

---

## 5. Weak CTA → one ask + one link + series promise

### Delete

Hashtag line (`#SoftwareEngineering…`).

### Ending block shape (combine with proof stance)

1. Proof-aligned close (A or B from §1).  
2. One-sentence takeaway (motor vs pilot).  
3. Series promise (1e / Part 2).  
4. Exactly one primary link + exactly one imperative ask.

### Recommended close (Option A)

```markdown
## What I can claim so far

Pixelanea shipped — desktop app, bundles, animation — with agents behind a continue/stop script, not vibes.

I am not declaring the hypothesis settled. Open-loop thrash got rarer on the paths we instrumented; residual error showed up as red matrix rows and capped retries instead of “the model said it was done.”

Power without feedback is still noise. Build the sensors first. Write the comparator in bash. Let the agent be the motor, not the pilot.

**Part 2:** how the harness is wired (rules, workers, stop scripts) — next post + the recursive agent loop spec in the repo.

Pixelanea is open source: https://github.com/paulocymbaum/pixelanea

**One ask:** Comment the one-sentence stop condition you would use on your next agent run. If you don’t have one, that’s the bug.
```

### Soft CTA earlier (max one)

First Pixelanea mention: parenthetical repo URL once. No mid-article CTAs.

**Done when:** zero hashtags; one ask; one primary URL; Part 2 promised.

---

## Target Part 1 outline (after all five fixes)

1. Hook + hypothesis + Pixelanea as plant + repo link + “not a feature tour / Part 2 later”  
2. Open loop feels productive  
3. Thermostat only  
4. Multi-stack app needs a written target (contract) — short  
5. Measure → compare → correct + **mapping table** (+ static diagram or drop Mermaid)  
6. Three kinds of measurement — short bullets  
7. **One disturbance** (concrete, imperfect) — hero proof  
8. Three rules: scripts decide stop; sensors outside chat; cap retries  
9. What I can claim so far + Part 2 tease + CTA  

Everything currently in “Wiring the plant” and most of nested cascade prose → **Part 2 / spec**.

---

## Work packages (implementation)

| ID | Package | Touches | Depends on |
|----|---------|---------|------------|
| P0 | Fill locked-decision table | this plan (checkbox) | — |
| P1 | Proof inventory note | skill-outputs scratch | P0 stance |
| P2 | Cut wiring section + Part 2 tease | article | P0 Part-2 home |
| P3 | Metaphor diet + mapping table + Mermaid decision | article | P2 |
| P4 | Expand disturbance + proof close language | article | P1 |
| P5 | CTA + series promise + delete hashtags | article | P0 CTA, P4 |
| P6 | Media usage table + caption hooks + 1a–1e order | `linkedin-media-assets.md` | P0 series shape |
| P7 | Optional: capture proof still (red matrix / stop JSON) for 1d | `docs/media/linkedin/` | P1 |

**Suggested PR split:** one PR for article rewrite (P2–P5); one PR or same PR for media calendar copy (P6). Do not block article on new GIF recording unless captions need a new proof still (P7).

---

## Acceptance checklist

- [x] Stance A/B locked; subtitle and close agree  
- [x] “123” verified or removed; “hypothesis held” gone or evidence-backed  
- [x] ≥1 imperfect concrete disturbance cycle in Part 1  
- [x] Only thermostat as extended metaphor; one mapping table  
- [x] No cruise / refinery / strain-gauge / craftsmen / flight-instrument language  
- [x] “Wiring the plant” removed from Part 1 (or ≤3 sentences + link)  
- [x] Part 2 tease + destination present  
- [x] Hashtags gone; one ask; one primary link  
- [x] Media doc lists 1a→1e order and bridge sentence in captions  
- [x] Part 1 word count roughly 900–1,200 (≤1,400 hard ceiling)

---

## Out of scope (do not expand this pass)

- Rewriting `recursive-agent-loop-spec.md` into LinkedIn voice (Part 2 draft can be a later epic)  
- Full product marketing site / landing page  
- Changing app UX to “prove” the article  
- Inventing before/after metrics when inventory finds none  

---

## Bottom line

Fix proof and CTA so the close is honest. Cut wiring so readers finish. Starve metaphors so the model transfers. Publish GIFs as **plant episodes** in a numbered spine, not as a second product. Then Part 1 can ship; Part 2 carries the harness.
