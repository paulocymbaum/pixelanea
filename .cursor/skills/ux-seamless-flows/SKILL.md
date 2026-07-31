---
name: ux-seamless-flows
description: Identifies common UX mistakes and applies the top 10 practices for seamless user flows and polished UI. Use when designing screens, reviewing flows, writing microcopy, planning wizards or onboarding, auditing usability, or when the user asks about UX best practices, friction, visual hierarchy, or flow continuity.
---

# UX Seamless Flows

Actionable UX guidance for designing and reviewing interfaces. Complements project-specific flows in [UX.md](../../../UX.md) and visual specs in [DESIGN.md](../../../DESIGN.md).

## When to apply

- Designing a new screen, wizard, or interaction
- Reviewing a PR for usability or visual polish
- Diagnosing drop-off, confusion, or support complaints
- Balancing "beautiful UI" with task completion speed

---

## Biggest UX mistakes

Avoid these — they break flow more than any visual flaw.

### 1. Unclear primary action

Multiple competing CTAs, vague labels ("Submit", "OK"), or burying the main action below secondary options. Users hesitate; tasks stall.

**Fix:** One obvious next step per screen. Label buttons with outcome verbs ("Export PNG", "Save project").

### 2. Hidden system state

Users don't know if work saved, a tool is active, or an operation is running. Silent failures and missing loading states destroy trust.

**Fix:** Show status immediately — spinners, progress, toasts, disabled states with reason. Never leave the canvas or form ambiguous.

### 3. Breaking flow with modals and context switches

Interrupting mid-task for confirmations, ads, sign-up walls, or navigation that loses unsaved work.

**Fix:** Inline edits, undo over confirm dialogs, autosave, and non-blocking feedback. Reserve modals for destructive or irreversible actions.

### 4. Inconsistent patterns

Same action looks or behaves differently across screens (save in header vs footer, different shortcut keys, mismatched terminology).

**Fix:** One pattern per action class. Document it; reuse components.

### 5. Cognitive overload on first visit

Exposing every feature, panel, and setting before the user has a goal. Dashboards of empty states with 20 buttons.

**Fix:** Progressive disclosure — show tools when relevant (`frameCount > 1` → frame strip). Sensible defaults; advanced options behind "More".

### 6. Form and input friction

Asking for data you don't need yet, unclear validation, errors only on submit, tiny touch targets, no keyboard path.

**Fix:** Minimal fields, inline validation, specific error messages with recovery steps, 44px minimum touch targets, full keyboard support.

### 7. Weak visual hierarchy

Everything the same weight — users scan randomly instead of following a path. Decorative chrome competes with the hero content.

**Fix:** One focal point per view. Size, contrast, and whitespace guide the eye. In editors: **content is the hero** (canvas ≥60% width).

### 8. Jargon and implementation leakage

Error codes, stack traces, internal IDs, or feature names users never chose.

**Fix:** Plain language. Say what happened and what to do next. Externalize copy for consistency ([UX.md § microcopy](../../../UX.md)).

### 9. Ignoring accessibility and motion

Low contrast, no focus indicators, keyboard traps, autoplaying animation without reduced-motion support.

**Fix:** WCAG AA contrast, visible focus rings, logical tab order, `prefers-reduced-motion`, screen-reader labels on icon-only controls.

### 10. Designing for the happy path only

Empty states, errors, slow networks, partial permissions, and edge cases treated as afterthoughts.

**Fix:** Design empty, loading, error, and success states **with** the main flow. Every dead end needs an exit.

### 11. Beauty without function

Gradients, glass effects, and animation that slow tasks or reduce readability. Style that obscures affordances.

**Fix:** Beauty serves clarity — typography, spacing, and color reinforce hierarchy; motion explains state change; decoration never blocks interaction.

### 12. No feedback loop after action

User completes a step but can't tell if it worked. Export "succeeds" with no file, save with no indicator.

**Fix:** Confirm outcome visibly — checkmark, file path, preview update, or subtle state change in the UI.

---

## Top 10 practices for seamless flows + beautiful UI

Apply these in order when shaping any flow.

### 1. Start from the user's job, not the feature list

Define: *When I [situation], I want to [motivation], so I can [outcome].* Map screens to jobs, not database tables.

**Flow check:** Can a first-time user complete the core job without reading docs?

### 2. Design the golden path first

Sketch the shortest successful path (happy path) end-to-end. Then add branches, settings, and edge cases without widening the main road.

**Pixelanea example:** Import → pixelate → tweak palette → export PNG before exposing animation tooling.

### 3. One screen, one decision

Each step answers one question or enables one action. Split wizards that ask unrelated questions on the same page.

**UI tie-in:** Single column layout for decisions; secondary info in side panels or collapsible sections.

### 4. Maintain spatial and temporal continuity

Keep navigation stable (persistent header, tool rail). Don't jump layouts between steps. Preserve scroll position and selection when possible.

**Beautiful UI:** Consistent grid, spacing scale, and component library — users feel oriented, not lost.

### 5. Progressive disclosure

Reveal complexity only when needed. Default to simple; expose power on intent (hover, "Advanced", context menu).

**Rule:** If fewer than 10% of users need it daily, it shouldn't compete with primary tools.

### 6. Immediate, proportional feedback

Every input gets a response within 100ms perceived (optimistic UI where safe). Feedback matches stakes — toast for save, inline for validation, modal only for delete.

**Polish:** Micro-interactions (button press, toggle, tool switch) use short, easing motion — not gratuitous animation.

### 7. Forgiving by default

Undo, autosave, clear cancel, non-destructive previews. Prefer reversible actions over confirmation dialogs.

**Copy pattern:** "Duplicate to 8 frames" with preview, not "Are you sure?" on every duplication.

### 8. Visual hierarchy that matches task priority

| Priority | Treatment |
|----------|-----------|
| Primary action | Filled button, highest contrast |
| Secondary | Outline or ghost |
| Tertiary | Text link |
| Chrome | Recede — lower contrast, smaller type |
| Hero content | Maximum space and contrast |

Use a single accent color for interactive emphasis. Limit palette noise.

### 9. Typography and spacing as UX

Readable line length (45–75 chars), consistent type scale, generous whitespace between groups. Clutter is a flow problem.

**Beautiful UI:** Fewer font sizes and weights beat decorative variety. Align to an 4px/8px spacing grid.

### 10. Test the flow, not just the screen

Walk through with realistic data: empty project, huge file, slow save, wrong file type, mid-flow back navigation. Flow breaks appear between screens, not on mockups.

**Review checklist:**

```
[ ] Entry: user knows where they are and what to do next
[ ] Middle: no dead ends; back/undo works
[ ] Exit: clear success state or graceful error recovery
[ ] Return: user can resume without re-entering data
[ ] Keyboard + pointer paths both work
[ ] Reduced motion and screen reader paths considered
```

---

## Flow + UI review template

Use when reviewing designs or implementations:

```markdown
## Flow: [name]

**Job:** When I …, I want …, so I can …

**Golden path:** Step 1 → Step 2 → … → Done

### Mistakes to watch
- [ ] Primary action obvious?
- [ ] State visible (loading/saved/error)?
- [ ] Modals justified?
- [ ] Patterns consistent with rest of app?
- [ ] Overwhelming on first visit?
- [ ] Edge cases designed?

### Practices applied
- [ ] One decision per step
- [ ] Progressive disclosure
- [ ] Immediate feedback
- [ ] Forgiving (undo/autosave)
- [ ] Hierarchy matches priority
- [ ] Flow tested end-to-end
```

---

## Project context (Pixelanea)

When working in this repo, layer this skill under:

| Concern | Source |
|---------|--------|
| Personas, jobs, flows | [UX.md](../../../UX.md) |
| Tokens, layout, components | [DESIGN.md](../../../DESIGN.md) |
| Shell regions, canvas rules | [pixelanea-frontend-standards](../pixelanea-frontend-standards/SKILL.md) |

**Non-negotiables here:** Canvas is the hero; chrome stays out of the way; local-first (no account walls); plain microcopy; panels collapse instead of cluttering.

---

## Quick reference

| Mistake | Practice that fixes it |
|---------|------------------------|
| Unclear CTA | Visual hierarchy + outcome labels |
| Hidden state | Immediate feedback |
| Modal overload | Forgiving defaults + progressive disclosure |
| Feature dump | Golden path + progressive disclosure |
| Inconsistency | Shared components + one pattern per action |
| Ugly but usable → pretty but slow | Beauty serves hierarchy, never blocks hero content |
