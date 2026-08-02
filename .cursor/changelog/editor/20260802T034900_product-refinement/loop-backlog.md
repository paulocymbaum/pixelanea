# Loop Backlog — Right Palette Section-Rail Refactor

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Feature area** | editor |
| **Trigger** | UX critique (`.cursor/changelog/editor/20260802T023749_uxui-design-critique/uxui_design_critique.md`) — power tools buried in `PaletteMoreToolsSection` `<details>` at bottom of single scroll |
| **Horizon** | Next implementable batch (frontend-only, no OpenAPI) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

The UX critique audited `RightPalettePanel` and found Riley's paint loop blocked by a single `overflow-y-auto` column stacking swatches, presets, three full-width action buttons, and collapsed "More tools" (`PaletteShadingSection` + `ColorFiltersSection`). Collapsed state (`w-10`) shows only a chevron — zero discoverability for shading/filters. The agreed fix is a 40px icon section rail (Swatches | Presets | Shading | Filters) with per-tab scroll, compact icon actions, and a collapsed vertical icon strip. Scope is frontend-only (`shell/`, `components/palette/`, `components/filters/`, `state/uiStore` or `sessionStore`); no backend or OpenAPI changes. Existing tests include `PaletteMoreToolsSection.test.tsx` and `uiStore.test.ts`.

## Dialogue summary

- **Jordan** anchored Batch 1 on structural refactor: new `PaletteSectionRail`, `RightPalettePanel` layout split, delete `PaletteMoreToolsSection`, `palettePanelSection` in `uiStore` (ephemeral). Warned that bare `1–4` keys conflict with existing palette color shortcuts in `shortcuts.ts` — Alt+1–4 only.
- **Sam** insisted Batch 1 must deliver a user-visible golden path: one click to Shading/Filters without scroll, collapsed strip that hints at all four modes for Morgan's workshop.
- **Jordan** deferred sticky Filters footer and keyboard shortcuts to Batch 2 — Filters tab alone removes the scroll cliff; sticky footer is layout polish inside an already-isolated tab.
- **Sam** promoted active-filter badge into Batch 2 (not Batch 3) — `hasActiveColorFilters` already exists in `lib/colorFilters.ts`; cheap state signal for Riley.
- **Both** deferred session persistence of last tab and quick preset chips to Batch 3 — UX.md already promises "panel collapse remembered"; tab memory is continuity polish, not unblocker.
- **Unresolved tension recorded:** horizontal tabs vs side rail — product sticks with side rail for collapsed `w-10` affordance; revisit if `palettePanelWidth` drops below 200px.

## Batched tasks

### Batch 1 — Core section rail (must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Add `PaletteSectionRail` — 4 icon tabs (Swatches/Presets/Shading/Filters), `Tooltip` + `aria-label` + `aria-current`, accent left border mirroring `toolButtonVariants` | frontend | Navigation chrome for critique golden path; reusable from expanded and collapsed states | — |
| B1-02 | Add `palettePanelSection` to `uiStore` (`'swatches' \| 'presets' \| 'shading' \| 'filters'`) with setter; default `'swatches'` | frontend | Single source for active tab across expanded/collapsed panel | — |
| B1-03 | Refactor `RightPalettePanel` — sticky header unchanged; body = rail + per-tab scroll region; render only active section (`PaletteSwatchGrid`, `PalettePresets`, `PaletteShadingSection`, `ColorFiltersSection`) | frontend | Eliminates single-scroll cliff; P0-1 fix | B1-01, B1-02 |
| B1-04 | Compact `PaletteActions` to icon row (Add/Edit/Remove) with tooltips; place below swatch grid on Swatches tab only | frontend | Recovers ~120px vertical space; P0-3 | B1-03 |
| B1-05 | Collapsed state (`w-10`): vertical icon strip (same 4 icons) + expand chevron; icon click expands panel and selects tab | frontend | Morgan discoverability; P0-2 | B1-01, B1-02 |
| B1-06 | Remove `PaletteMoreToolsSection`; migrate any layout props to tab bodies; update/delete `PaletteMoreToolsSection.test.tsx`; add `PaletteSectionRail.test.tsx` and `RightPalettePanel` integration coverage | frontend | Retire anti-pattern; prevent regression on disclosure behavior | B1-03 |

### Batch 2 — Filters UX & rail polish (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | `ColorFiltersSection`: sticky footer with Apply/Reset always visible; content area scrolls independently inside Filters tab | frontend | Tall lighting-point lists hide primary actions today; P1-3 | B1-03 |
| B2-02 | Keyboard shortcuts `Alt+1`–`Alt+4` for palette sections; document in shortcuts overlay + `content/copy.ts`; guard `event.altKey` in `shortcuts.ts` (do not use bare digits — conflict with color index 1–9) | frontend | Power-user path; P1-4 | B1-02 |
| B2-03 | Align rail buttons with left-rail grammar — reuse `toolButtonVariants` sizing/border tokens; wire `TooltipProvider` on section icons (already on `EditorPage`) | frontend | Spatial consistency mistake #4; P1-1/P1-2 | B1-01 |
| B2-04 | Active-filter badge dot on Filters rail icon when `hasActiveColorFilters(colorFilters)` | frontend | Immediate state feedback without opening tab; critique P2-2 promoted by PM | B1-01, B1-03 |

### Batch 3 — Session continuity & Casey shortcuts (could ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Persist `palettePanelSection` in `sessionStore` (alongside `palettePanelWidth`); hydrate on editor load | frontend | UX.md persistent session memory; critique P2-1 | B1-02 |
| B3-02 | Swatches tab: horizontal quick-preset chips + "See all" link jumping to Presets tab | frontend | Reduces tab hops for Casey; critique P2-3 | B1-03 | **Done** |
| B3-03 | Optional: `]` / `[` to cycle sections (document alongside Alt+1–4) — only if Alt bindings validated in workshop | frontend | Alternative nav for Riley; lower priority than Alt+1–4 | B2-02 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 6 | 0 | 6 |
| Batch 2 | 0 | 4 | 0 | 4 |
| Batch 3 | 0 | 3 | 0 | 3 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 (all editor sessions) | 2 (high — unblocks shading/filter golden path) | 85% | 1.0 | 1360 | 1 |
| Batch 2 | 500 (filter/shade-heavy Riley + power users) | 1.5 (medium-high — polish on working tabs) | 80% | 0.5 | 1200 | 2 |
| Batch 3 | 300 (returning users + preset tinkerers) | 0.5 (low — delight/continuity) | 75% | 0.4 | 281 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where Confidence is decimal (85% → 0.85).

**RICE notes:**

- Batch 1 wins on impact and reach — every editor session touches the palette panel; structural fix is prerequisite for all other items.
- Sam would not promote Batch 3 above Batch 2 despite similar effort — workshop pilot needs discoverable tools (Batch 1) and visible Apply/filter state (Batch 2) before preset chips.
- Batch 2 effort stays low because `hasActiveColorFilters`, `Tooltip`, and `toolButtonVariants` already exist; main cost is sticky footer layout in `ColorFiltersSection`.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 78 | 42 | high impact / low risk | Ship behind component tests; keep `PaletteShadingSection` / `ColorFiltersSection` APIs unchanged; feature-flag not needed — layout-only swap |
| Batch 2 | 55 | 28 | measurable UX win / low risk | Alt+1–4 integration test in `shortcuts.ts`; verify no conflict with palette digit keys |
| Batch 3 | 30 | 22 | nice-to-have / low risk | `sessionStore` persist migration is additive; default `'swatches'` if key missing |

```text
Impact ↑
100 │     │          │
 75 │     │ Batch 1  │
 50 │     │ Batch 2  │
 25 │ Batch 3│        │
  0 └─────┴──────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Ship Batch 1 first** — section rail + collapsed strip + compact actions + delete `PaletteMoreToolsSection`.
- **Frontend-only** — no OpenAPI, migrations, or domain changes; respects `apps/web` → client dependency direction.
- **Side rail over horizontal tabs** — required for collapsed `w-10` icon strip; horizontal pills deferred unless panel width tightens.
- **Section state in `uiStore` for Batch 1**; move to `sessionStore` in Batch 3.
- **Alt+1–4** for section shortcuts (not bare 1–4) due to `shortcuts.ts` palette color bindings.
- **Presets as separate tab** — Swatches tab stays minimal for Riley paint loop (Maya/Leo compromise from critique).

### Deferred

- Horizontal tab bar variant if `palettePanelWidth` < 200px.
- Morgan "show labels on rail" preference toggle (P2 workshop mode).
- `]` / `[` section cycling until Alt bindings proven in pilot.

### Open questions

- Should expanding via collapsed icon auto-focus first interactive control in that tab (a11y), or leave focus on canvas?
- Do E2E tests need a new scenario in `e2e/` for shading-without-scroll, or is unit/integration coverage sufficient for this batch?
- Quick preset chips (B3-02): use `lastPalettePreset` from `sessionStore` or static top-N from `palettePresets.ts`?

## Recommended next action

Implement **Batch 1** first via skill-implementer targeting `shell/RightPalettePanel.tsx`, new `components/palette/PaletteSectionRail.tsx`, `state/uiStore.ts`, and `components/palette/PaletteActions.tsx`. Success for the next loop iteration: Riley opens a project, clicks the Shading or Filters icon (expanded or from collapsed strip) with **zero scroll**, picks a shade or reaches filter sliders in one interaction; `PaletteMoreToolsSection` is deleted and tests green. Frontend owns the full slice; no backend pairing required.
