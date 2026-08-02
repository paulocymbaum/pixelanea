# UX/UI Design Critique — Right Palette Drawer

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Target** | `RightPalettePanel` and nested palette components |
| **Persona** | Riley (primary), Casey (secondary), Morgan (workshop discoverability) |
| **Scope** | Implemented UI — refactor recommendations |

## Job statement

When I am painting pixel art, I want to switch between palette colors and power tools (shading, filters) without scrolling, so I can stay in flow and keep the canvas as my focus.

## Golden path

1. Open project → palette panel expanded, **Swatches** tab active
2. Pick active color from grid (top of panel, no scroll)
3. Need a preset → tap **Presets** icon → apply → back to Swatches
4. Need shade ramp → tap **Shading** icon → pick shade → returns to painting
5. Need lighting overlay → tap **Filters** icon → adjust → Apply to frame
6. Collapse panel when canvas needs space → icon strip remains for one-click expand + last tab

## Dialogue summary

**Maya** identified the failure mode: a single `overflow-y-auto` column stacks swatches, presets, three full-width action buttons, and a collapsed `<details>` for shading + filters. Power tools require scroll → expand → scroll again — three interactions before the first filter slider.

**Leo** noted the left rail already solves tool switching with icon + label in 80px; the right panel ignores that pattern and treats everything as one document. Visual weight is inverted: presets (occasional) sit above shading/filters (workflow tools for Riley).

**Maya** pushed back on pure icon-only: Morgan's requirement is icon + label always on toolbar tools. Compromise: **icon rail with tooltips** for section switching (chrome), but keep text labels inside each section's content and on primary actions.

**Leo** proposed a **sticky section rail** inside the right drawer: 4 icon tabs below the header, content scrolls per-tab only. Collapsed state shows a vertical icon strip (not just a chevron) mirroring the left tool rail grammar.

**Both agreed** shading and filters belong in the right panel (palette-adjacent) but must not compete vertically with swatches. DESIGN.md's "right = palette" still holds — these are palette *modes*, not paint tools.

## Findings

### Critical (P0) — blocks task completion or trust

- **P0-1:** Power tools (shading, color filters) are buried at the bottom of one long scroll, behind a collapsed `<details>` (`PaletteMoreToolsSection`). Users cannot reach filters without scrolling past swatches, presets, and three action buttons — violates golden-path-first (ux-seamless-flows mistake #1, #7).
- **P0-2:** Collapsed panel (`w-10`) exposes only an expand chevron — no hint that shading or filters exist. Discoverability is zero for first-time Riley and workshop Morgan.
- **P0-3:** `PaletteActions` uses three full-width labeled buttons consuming ~120px+ vertical space before any power tool — pushes tools further down; should be compact icon actions with tooltips.

### Warnings (P1) — meaningful friction or inconsistency

- **P1-1:** Left rail uses `toolButtonVariants` (icon + label, active border); right panel uses unrelated patterns (`<details>`, full `Button` rows). Inconsistent spatial grammar (mistake #4).
- **P1-2:** Tooltip infrastructure exists (`TooltipProvider` on `EditorPage`) but is unused on editor chrome tools — missed opportunity for compact icon rails.
- **P1-3:** Color filters section is very tall when lighting points exist; even after tab separation, Filters tab needs internal accordion or sticky Apply bar.
- **P1-4:** No keyboard shortcut or arrow-key path between right-panel sections.

### Suggestions (P2) — polish and delight

- **P2-1:** Remember last active right-panel tab in `sessionStore` (like palette collapse state).
- **P2-2:** Badge dot on Filters tab when `hasActiveColorFilters()` — immediate state feedback (mistake #2).
- **P2-3:** Compact preset row (horizontal scroll chips) on Swatches tab as "quick presets" with "See all" link to Presets tab — reduces tab hops for Casey.

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — **No** — active color is clear; power tools are not
- [x] State visible (loading/saved/error)? — Palette lock visible in header
- [x] Modals justified? — Color edit/remove dialogs appropriate
- [ ] Patterns consistent? — **No** — left rail vs right stack diverge
- [ ] Overwhelming on first visit? — **Borderline** — collapsed "More tools" hides complexity but also hides value
- [ ] Edge cases designed? — Read-only disables filters; collapsed state under-designed
- [ ] Hierarchy matches priority? — **No** — occasional presets outrank daily shading/filters
- [ ] Beauty serves clarity? — Flat panels fine; layout works against task priority

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ❌ | Swatch pick is fast; tool access is not |
| One decision per step | ⚠️ | Single scroll mixes color pick, preset, edit, shade, filter |
| Progressive disclosure | ⚠️ | Over-disclosed stack, under-disclosed tools |
| Immediate feedback | ⚠️ | Active swatch clear; no tab-level active-filter signal |
| Forgiving (undo/autosave) | ✅ | Filters preview non-destructive until Apply |
| Visual hierarchy | ❌ | Everything same panel weight |
| Flow tested end-to-end | ❌ | Shading → paint → filter requires excessive scrolling |

## Agreed recommendations

### Proposed layout — "Palette drawer with section rail"

```text
┌─ RightPalettePanel ─────────────────────┐
│ Palette          [lock] [collapse →]    │  ← sticky header (unchanged)
├────┬────────────────────────────────────┤
│ 🎨 │  [active section content]        │
│ 📋 │  scrolls independently           │
│ ☀  │  per tab only                    │
│ ✨ │                                  │
└────┴────────────────────────────────────┘
  ↑ 40px icon rail, tooltips, aria-labels
```

| Tab | Icon (Lucide) | Tooltip / aria-label | Content |
|-----|---------------|----------------------|---------|
| Swatches | `palette` | "Swatches" | `PaletteSwatchGrid` + compact icon action row (Add/Edit/Remove with tooltips) |
| Presets | `layout-grid` | "Presets" | `PalettePresets` |
| Shading | `sun` | "Shading palettes" | `PaletteShadingSection` |
| Filters | `sparkles` | "Color filters" | `ColorFiltersSection`; badge when filters active |

**Collapsed state (`w-10`):** Vertical icon rail (same 4 icons) + expand chevron at bottom. Clicking an icon expands panel and selects that tab. Active tab gets accent left border (mirror `toolButtonVariants`).

**Remove:** `PaletteMoreToolsSection` `<details>` wrapper — sections become first-class tabs.

**Component sketch:**
- New `PaletteSectionRail` — icon buttons, `Tooltip` + `aria-label`, `aria-current` for active tab
- New `uiStore` or `sessionStore` key: `palettePanelSection: 'swatches' | 'presets' | 'shading' | 'filters'`
- Refactor `RightPalettePanel` to render header + rail + conditional section body

### Numbered actions

1. **Replace single scroll stack with icon section rail + per-tab scroll** — `RightPalettePanel`, new `PaletteSectionRail` — **eng**, **M**
2. **Compact palette actions to icon buttons with tooltips** (Add/Edit/Remove) below swatch grid — `PaletteActions` — **ui/eng**, **S**
3. **Collapsed-state icon strip** — expand + jump to section in one click — `RightPalettePanel` — **eng**, **S**
4. **Filters tab: sticky footer** with Apply / Reset always visible — `ColorFiltersSection` — **ui**, **S**
5. **Active-filter badge** on Filters icon — `PaletteSectionRail` + `hasActiveColorFilters` — **eng**, **S**
6. **Keyboard:** `]` / `[` or `Alt+1–4` to cycle right-panel sections (document in shortcuts) — **eng**, **M**
7. **Persist last section** in `sessionStore` — **eng**, **S**
8. **Delete `PaletteMoreToolsSection`** after migration; update tests — **eng**, **S**

## Unresolved tension

- **Maya** wants Presets demoted (separate tab) so Swatches tab stays minimal for Riley's paint loop.
- **Leo** prefers a horizontal tab bar under the header instead of a side rail — saves 40px width on narrow panels.
- **Product call:** Side rail (recommended) reuses left-rail muscle memory and works in collapsed `w-10` state; horizontal tabs break collapsed affordances. If panel width is tightened below 240px, revisit horizontal pills.

- **Morgan's "icon + label always"** vs user's "icons with tooltips": Resolved as **labels in tooltips + `aria-label`**, with visible text inside each section body. Section rail icons are navigation chrome, not primary teaching surfaces — workshop mode could add a "Show labels" preference later (P2).

## Files reviewed

- `apps/web/src/shell/RightPalettePanel.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/shell/EditorLayout.tsx`
- `apps/web/src/components/palette/PaletteSwatchGrid.tsx`
- `apps/web/src/components/palette/PalettePresets.tsx`
- `apps/web/src/components/palette/PaletteActions.tsx`
- `apps/web/src/components/palette/PaletteMoreToolsSection.tsx`
- `apps/web/src/components/palette/PaletteShadingSection.tsx`
- `apps/web/src/components/palette/ShadingPalettePicker.tsx`
- `apps/web/src/components/filters/ColorFiltersSection.tsx`
- `apps/web/src/components/ui/Tooltip.tsx`
- `apps/web/src/components/ui/tool-button.ts`
- `apps/web/src/pages/EditorPage.tsx`
- `DESIGN.md` (Editor shell, Palette panel)
- `UX.md` (personas, palette requirements)

## References

- ux-seamless-flows skill — mistakes #1, #4, #5, #7; practices #2, #3, #5, #8
- DESIGN.md § Editor shell, § Palette panel, § Toolbar tools
- UX.md — Riley paint loop, Morgan icon+label, Casey collapsible palette
