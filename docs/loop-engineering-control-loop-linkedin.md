# Loop Engineering as a Control Loop

*LinkedIn article draft — testing a hypothesis*

---

**Hypothesis:** AI-assisted development becomes stable when you treat it like control engineering — measuring output, correcting on error, and iterating until the system converges on a defined setpoint. Not when you treat it like a one-shot API call.

I tested this building **[Pixelanea](https://github.com/pixelanea/pixelanea)**, a local-only desktop pixel art editor — React canvas, C++ server, native shell. One prompt can fix a brush and quietly break frame sync three layers away.

That app is the thing under control — the desktop plant that breaks when the loop is open. Feed clips (blank → paint → save, import, animation) show what it looks like when sensors can tell the truth. This article is the feedback path, not a feature tour. Harness wiring is **Part 2**.

---

## Open loop feels productive. It isn't stable.

You prompt. The model writes code. You run tests. Something breaks. You prompt again.

No memory of the last measurement. No shared definition of done. You are the thermostat, the sensor, and the actuator — diffs at midnight, suites by hand, deciding whether to stop or push once more.

It works until it doesn't. Then the room swings: too hot, too cold, worse than when you started.

---

## You already know closed-loop control

**The thermostat.** You want 22°C. The room is 26°C. The AC runs. It overshoots. The heater corrects. Each cycle narrows the gap. Measure, compare, correct — until error is small enough.

**Open loop:** blast the AC because it felt hot once, then leave the house. Action without feedback.

---

## A multi-stack app needs a written target

Pixelanea was the test rig: paint, undo, animate, save to a portable file — offline, no cloud to hide behind.

UI must never touch the database; C++ owns persistence and image work; a shell glues them over localhost. They share a **contract** — an OpenAPI spec every payload and error shape must match. The UI consumes a generated client from that spec and nothing else. That written target is what makes “done” measurable.

Without it, every iteration renegotiates the goal. With it, the implementation matches the contract or it does not.

Disturbances still arrive. A canvas fix ripples into frame sync. An agent declares victory while three cases are red. Chat resets and iteration four forgets what iteration two broke. Left unstructured, the system **swings** — and the human becomes the only controller.

That is not a model-intelligence problem. It is a **missing feedback path**.

---

## The loop: measure, compare, correct

> **Measure → compare to setpoint → correct → measure again.**

| Control term | In this harness |
|--------------|-----------------|
| Setpoint | Done definition: tests green, review threshold, stop script says stop |
| Sensor | Harness / matrix / E2E artifacts outside chat |
| Error | Failed cases, open findings, residual after a pass |
| Actuator | The LLM (writes code, proposes fixes) |
| Controller | Bash/Node scripts that return continue or stop |

The LLM is powerful at *doing* and unreliable at *knowing when to stop*. Scripts — not the model — read sensors and return continue or stop. Motor vs pilot.

When error is non-zero, correct and measure again. When error is zero, stop. An **iteration cap** (default five) reports residual work instead of spinning forever.

Three practical requirements: a **fixed setpoint** before the loop starts; **sensors outside chat** so context loss cannot erase the last measurement; **bounded corrections** so one wild stroke cannot wreck the app.

---

## Three kinds of measurement

- **Fast tests** — Vitest harnesses that simulate a paint stroke in milliseconds.
- **Matrix checklist** — row-by-row panel an orchestrator reads; failed row = error against the spec, not the worker’s self-report.
- **E2E / journeys** — full paths on a running stack.

If your only sensor is the slowest one, you fly blind between checks. If you skip the cheap local check, every disturbance hits the expensive instruments at once.

The paint, project I/O, import, and animation matrix harnesses alone hold **129** cases, meant to stay ID-linked from contract → harness → matrix → E2E. Same written target, four depths of checks. (The full Vitest suite is larger; I am not pretending one tidy number covers the repo.)

---

## One disturbance, one correction cycle

Picture a frame-sync race: rapid navigation leaves a pending snapshot while a PUT is still in flight. The sensor that should catch it is a harness like `SyncCoordinator` coalescing that write — if the lane races wrong, the matrix row stays red.

Designed path: orchestrator dispatches a worker (investigate sync → develop against the contract → review). Bash comparator: score below threshold, critical finding open — not done. Second pass. Harness green. Controller stops.

Coupled failures across canvas and API get batched recovery, one layer at a time. Sometimes you hit the iteration cap with residual red rows and a human finishes. That is still closed loop: residual error is visible, not buried in chat optimism.

---

## Three rules worth stealing

1. **Scripts decide stop.** The model implements; continue/stop lives in a comparator on artifacts.
2. **Sensors live outside chat.** Checklists and counters survive context reset.
3. **Define done first; cap retries.** One-sentence stop condition, automated comparison, residual reported when the cap hits.

Contracts before corrections. Pre-verify cheaply; validate independently. Trusting the actuator’s self-report alone is open loop with extra steps.

---

## Part 2 (next)

How the harness is wired — rules, worker investigate→develop→review, supervisor loop, bash continue/stop — is in [`docs/recursive-agent-loop-spec.md`](https://github.com/pixelanea/pixelanea/blob/main/docs/recursive-agent-loop-spec.md) and a follow-up post. This piece stops at the control model and one disturbance class.

---

## What I can claim so far

Pixelanea shipped — desktop app, bundles, animation — with agents gated by a continue/stop script, not vibes.

I am not declaring the hypothesis settled. Open-loop thrash got rarer on the paths we instrumented; residual error showed up as red matrix rows and capped retries instead of “the model said it was done.”

Power without feedback is still noise. Build the sensors first. Write the comparator in bash. Let the agent be the motor, not the pilot.

---

Pixelanea is open source: https://github.com/pixelanea/pixelanea

**One ask:** Comment the one-sentence stop condition you would use on your next agent run. If you don’t have one, that’s the bug.
