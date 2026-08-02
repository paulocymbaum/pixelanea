# Product Direction — Right Palette Drawer Section Rail

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (pixel artist — daily shading/filter use) |
| **Secondary personas** | Casey (swatch + preset only), Morgan (workshop discoverability) |
| **Teams convened** | Design (Maya, Leo) — prior session; Strategy (Sam, Jordan) — Taylor inline synthesis |
| **Upstream artifacts** | `.cursor/changelog/editor/20260802T023749_uxui-design-critique/uxui_design_critique.md` |

## Product vision

Pixelanea's editor keeps the canvas as the hero — chrome should get out of the way, not bury creative tools. The right palette drawer is where Riley lives between brush strokes: pick a color, grab a shade, tweak a filter. Today that loop is broken by a single long scroll and a hidden "More tools" disclosure. We will refactor the drawer into a **section rail** (icon + tooltip tabs) so every palette-adjacent tool is one click away, matching the spatial grammar of the left tool rail. This is a frontend-only, shippable batch that improves daily paint flow without expanding scope into new features.

## Chair brief

**Product question:** Should we approve the section-rail refactor for the right palette drawer, and what ships in the first batch?

**Primary persona:** Riley — needs shading and filters without scroll hunting.

**Success looks like:** Riley reaches Shading or Filters in ≤1 click from any panel state; swatch pick stays at zero scroll on the default tab; Morgan can discover all four sections when the panel is collapsed.

**Constraints:** Local-first, canvas ≥60% width, frontend-only (`shell/` + `components/palette/` + `state/`), no OpenAPI changes, Morgan a11y via `aria-label` + tooltips, existing tests updated not deleted blindly.

**Teams convened:** Design (completed); Strategy (inline — refinement subagent pending).

## Synthesis

### Aligned

- **Problem is real and P0:** `PaletteMoreToolsSection` behind `<details>` at the bottom of `RightPalettePanel`'s scroll stack is a flow break — design and strategy agree this blocks Riley's golden path.
- **Solution direction is correct:** Icon section rail with four tabs (Swatches, Presets, Shading, Filters), per-tab scroll, compact palette actions — not a new feature, a layout fix.
- **Scope stays frontend:** `RightPalettePanel`, new `PaletteSectionRail`, `PaletteActions` compaction, `uiStore`/`sessionStore` for active section — no server or contract work.
- **DESIGN.md still holds:** Right panel = palette domain; shading/filters are palette *modes*, not relocated paint tools.
- **Delete `PaletteMoreToolsSection`** once tabs absorb its children — reduces indirection, simplifies tests.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| Vertical side rail vs horizontal tabs under header | Design (Maya/Leo) | **Side rail** for v1 | Reuses left-rail muscle memory; works in collapsed `w-10` state; horizontal tabs break collapsed affordances |
| Icon-only rail vs Morgan's "icon + label always" | Design / UX.md | **Icons + tooltips + aria-labels** on rail; text labels inside section bodies | Rail is navigation chrome, not teaching surface; workshop can add "Show labels" preference later (defer P2) |
| Ship all 4 tabs at once vs incremental | Strategy | **All 4 tabs in Batch 1** | Partial migration leaves dual patterns; frontend-only M effort is bounded |
| Keyboard shortcuts (Alt+1–4) in v1? | Design P1 / Strategy | **Defer to Batch 2** | Rail solves core friction; shortcuts need `shortcuts.ts` + overlay docs |
| Quick preset chips on Swatches tab | Design P2 / Strategy | **Defer** | Presets tab already exists; chips duplicate value |
| Filter active badge on icon | Design P2 / Strategy | **Batch 2** | Low effort but not blocking MVP |

### Decisions

**We will**

- Approve the **Palette Section Rail** refactor as the next editor UX batch.
- Ship **Batch 1 (MVP)** in one PR:
  1. `PaletteSectionRail` — 4 icon tabs with Tooltip, `aria-current`, accent left border (mirror `toolButtonVariants`)
  2. Refactor `RightPalettePanel` — sticky header + rail + per-section scroll body
  3. Compact `PaletteActions` — icon buttons with tooltips (Add / Edit / Remove)
  4. Collapsed state — vertical icon strip; click icon → expand + select tab
  5. `uiStore.palettePanelSection` — active tab state
  6. Remove `PaletteMoreToolsSection`; migrate tests to rail/panel tests
  7. Filters tab — sticky Apply/Reset footer inside `ColorFiltersSection`
  8. Update `DESIGN.md` shell diagram note (right panel = section rail)
- Success metric: Riley task test — swatch → Shading → pick shade → back to paint in **≤3 clicks, zero scroll** on 1080p viewport.

**We will not (this loop)**

- Move paint tools (pencil, eraser, etc.) to the right panel — left rail stays canonical.
- Add horizontal tab bar variant — revisit only if panel width drops below 240px.
- Ship keyboard section cycling (Alt+1–4) in Batch 1.
- Ship quick-preset chips on Swatches tab.
- Expand color-filters functionality — layout only, no new filter types.

## Outcomes

| Priority | Outcome | Owner hint | Source | Batch |
|----------|---------|------------|--------|-------|
| P0 | Section rail with 4 tabs replaces single scroll stack | eng | design | 1 |
| P0 | Compact icon palette actions (Add/Edit/Remove + tooltips) | ui/eng | design | 1 |
| P0 | Collapsed-state icon strip (expand + jump to section) | eng | design | 1 |
| P1 | Filters sticky Apply/Reset footer | ui/eng | design | 1 |
| P1 | Pattern consistency with left rail (accent border, tooltips) | ui | design | 1 |
| P1 | Migrate/remove `PaletteMoreToolsSection` + update a11y tests | eng | design | 1 |
| P2 | Persist last tab in `sessionStore` | eng | design | 2 |
| P2 | Active-filter badge on Filters icon | eng | design | 2 |
| P2 | Keyboard shortcuts for section cycling | eng | design | 2 |
| P2 | Quick preset chips on Swatches tab | ux/ui | design | 3 (if validated) |

## Shippable batches

### Batch 1 — Section rail MVP (ship next)

**Scope:** ~6–8 files, frontend-only, estimated **M** (1–2 dev days).

- `shell/RightPalettePanel.tsx` — layout restructure
- `shell/PaletteSectionRail.tsx` — new
- `components/palette/PaletteActions.tsx` — compact icons
- `components/filters/ColorFiltersSection.tsx` — sticky footer
- `state/uiStore.ts` — `palettePanelSection`
- `content/copy.ts` — section labels if needed
- Tests: RightPalettePanel, PaletteSectionRail, migrate PaletteMoreToolsSection tests
- `DESIGN.md` — shell table update

**Exit criteria:**

- All 4 sections reachable in 1 click when panel expanded
- Collapsed panel shows 4 section icons + expand affordance
- Swatches tab: grid visible without scroll at default panel width
- Existing palette/a11y tests pass (updated for new structure)
- No regression in palette lock, read-only playback, or collapse persistence

### Batch 2 — Polish (follow-up)

- Persist `palettePanelSection` in `sessionStore`
- Filter active badge on Filters icon
- Keyboard shortcuts in `shortcuts.ts` + shortcuts overlay

### Batch 3 — Optional validation

- Quick preset chips on Swatches tab (only if workshop feedback requests it)

## Recommended next action

**Invoke `skill-implementer`** with Batch 1 scope. Point implementer at:

- Design spec: `.cursor/changelog/editor/20260802T023749_uxui-design-critique/uxui_design_critique.md`
- Product direction: this file
- Frontend standards skill for shell/canvas rules

After implementation, run `test-matrix-unit` on palette panel + uiStore cases, then optional `uxui-design-critique` pass on the implemented rail to verify P0 findings are closed.

**Do not** start Batch 2 until Batch 1 is merged and manually verified on 1080p and 1366×768 (common classroom projector resolution).

## Open questions

- Should `palettePanelSection` live in `uiStore` (session-only) or `sessionStore` (persisted across reloads)? **Defer to Batch 2** — `uiStore` is fine for Batch 1.
- Panel width resize handle — out of scope; current `sessionStore.palettePanelWidth` unchanged.
- E2E coverage for section rail — add in Batch 1 only if existing editor E2E harness makes it cheap; otherwise Batch 2.
