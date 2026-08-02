# UX/UI Design Critique — Right Palette Panel (`RightPalettePanel`)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Target** | Editor right drawer — `apps/web/src/shell/RightPalettePanel.tsx` and palette child sections |
| **Persona** | Primary: Riley (pixel artist), Casey (import/export); Secondary: Morgan (workshop discoverability) |
| **Scope** | Implemented UI |

## Job statement

When I am painting or refining pixel art, I want palette colors and color-adjacent power tools (presets, shading ramps, filters) within one or two interactions, so I can stay in flow without hunting through a long scroll stack.

## Golden path

1. Open editor → palette panel expanded (Riley) or collapsible (Casey)
2. Select active swatch from grid (keyboard 1–9 or click)
3. Optionally apply preset, add/edit color, or open shading/filters
4. Pick generated shade or configure overlay/lighting → apply to frame
5. Return to swatch grid and paint on canvas

**Current breakage:** Steps 3–4 require scrolling past swatches + presets + three full-width action buttons, expanding collapsed "More tools" `<details>`, then scrolling again inside shading + filters forms (~400px+ of controls).

## Dialogue summary

**Maya:** Riley's job is color selection first, palette expansion second. The golden path works for swatch pick (top of stack) but fails for shading ramps — Riley's daily workflow — because power tools sit at the bottom behind a closed disclosure. That's mistake #1 (unclear primary action *within the panel*) and #5 inverted: we buried tools that Riley uses more than presets.

**Leo:** Visually it's a flat column — swatch grid, presets label, three chunky secondary buttons, then a text-only "More tools" summary with no icon. Everything has equal section weight (`border-t`, `p-3`, `text-sm font-medium`). Mistake #7: hierarchy doesn't match task priority. Swatches should dominate; presets and edit actions are secondary; shading/filters are tertiary in *frequency* but primary in *vertical cost* when opened.

**Maya:** Morgan needs icon + label always on **toolbar** tools (UX.md). Right-panel mode switchers are not paint tools — icon + tooltip on hover/focus is acceptable if `aria-label` matches tooltip text and focus reveals the label. Casey wants the panel collapsible; collapsed state today is a 40px strip with only `ChevronLeft` — no hint that shading/filters exist (mistake #2 hidden state, #10 edge case).

**Leo:** Propose a **sticky icon tab rail** directly under the header (Palette title + lock + collapse). Tabs: Swatches · Presets · Edit · Shading · Filters. 40×40 icon buttons, `Tooltip` from `components/ui/Tooltip.tsx`, active tab = accent + 3px bottom border (mirror `toolButtonVariants` left-border idiom but horizontal). Body scrolls independently per tab — no cross-section scroll. Optional: dot badge on Filters when `hasActiveColorFilters()` or `placingLighting`.

**Maya:** Palette lock in header is correct (DESIGN.md, Alex). When locked, disable Edit tab actions and shading shade-add; show tooltip reason. Read-only playback: `ColorFiltersSection` already sets `disabled={readOnly}` — extend pattern to entire Edit/Shading tabs with a single banner "Playback mode — color tools paused."

**Leo:** Tension with DESIGN.md "Left = tools, Right = palette" — shading/filters are **palette-adjacent color workflow**, not paint tools. They stay right; we fix navigation, not region. Don't move them to left rail — that breaks mental model and steals canvas width.

**Convergence:** Replace single scroll + `<details>` with tabbed panel. Keep swatches as default tab. Icon+tooltip tabs satisfy discoverability without 240px-wide text labels. P0 = eliminate double-burial; P1 = collapsed affordances + Morgan a11y; P2 = session-persist tab + active badges.

## Proposed refactored layout

### Architecture (expanded panel, default width 240px from `sessionStore`)

```text
┌─────────────────────────────────────┐
│ Palette          [Lock] [Collapse ‹]│  ← sticky header (existing)
├─────────────────────────────────────┤
│ [■] [◇] [✎] [☀] [◐]                 │  ← NEW: icon tab rail (sticky)
│ Sw  Pr  Ed  Sh  Fi                   │    tooltips: full labels
├─────────────────────────────────────┤
│                                     │
│  (tab body — independent scroll)    │
│                                     │
│  Swatches: PaletteSwatchGrid only   │
│  Presets: PalettePresets            │
│  Edit: PaletteActions (icon row OK) │
│  Shading: PaletteShadingSection     │
│  Filters: ColorFiltersSection       │
│                                     │
└─────────────────────────────────────┘
```

### Tab definitions

| Tab | Icon (Lucide) | Tooltip / `aria-label` | Body content |
|-----|---------------|------------------------|--------------|
| Swatches | `palette` or grid glyph | "Palette swatches" | `PaletteSwatchGrid` only |
| Presets | `layout-grid` | "Palette presets" | `PalettePresetGrid` + label |
| Edit | `plus` or `settings-2` | "Edit palette" | `PaletteActions` (consider compact icon row: Add / Edit / Remove with tooltips) |
| Shading | `sun` or `blend` | "Shading palettes" | `PaletteShadingSection` |
| Filters | `sparkles` or `contrast` | "Color filters" | `ColorFiltersSection`; badge when active |

### Interaction rules

- **Default tab:** Swatches (golden path unchanged).
- **Tab switch:** 0ms content swap (DESIGN.md tool-switch timing); optional 150ms opacity only if `prefers-reduced-motion: no-preference`.
- **Keyboard:** Arrow keys move between tabs when tab rail focused; roving `tabindex`; Enter/Space activates. Existing swatch 1–9 shortcuts unchanged.
- **Persistence:** `sessionStore.lastPalettePanelTab` — restore on return (UX.md session memory).
- **Collapsed strip:** Vertical icon stack (same 5 icons) with tooltips; click expands panel **and** selects that tab. Solves discoverability without expanding width.
- **Remove:** `PaletteMoreToolsSection` `<details>` wrapper — obsolete after tabs.

### Visual spec (Leo)

- Tab rail: `flex`, `border-b border-border`, `bg-surface`, `sticky top-0 z-10` within panel.
- Tab button: 40×40 min, ghost variant, icon 20px stroke 1.5.
- Active: `border-b-[3px] border-accent text-primary font-medium` + optional `bg-accent-muted/30`.
- Inactive: `text-secondary`, hover `bg-accent-muted/50`.
- Tab body: `flex-1 overflow-y-auto` — each tab owns scroll; header + tab rail never scroll away.
- Filters badge: 6px accent dot top-right of icon when `hasActiveColorFilters(colorFilters) || placingLighting`.

### DESIGN.md alignment note

| Doc rule | Resolution |
|----------|------------|
| Left panel = paint tools | Unchanged |
| Right panel = palette | Swatches + palette editing remain default home |
| Toolbar icon + label | Applies to `LeftToolRail`; right-panel **mode tabs** use icon + tooltip + `aria-label` (DESIGN.md: "Tooltip — toolbar hints; not required on every control") |
| Progressive disclosure | Tabs *are* disclosure — one section visible, no nested `<details>` |
| Palette lock visible | Stays in header; disabled tabs show muted state + tooltip |

## Findings

### Critical (P0) — blocks task completion or trust

1. **Power tools double-buried** — `PaletteMoreToolsSection` is `<details>` collapsed by default, placed after swatches + presets + three action buttons in a single `overflow-y-auto` column (`RightPalettePanel.tsx` L59–65). Riley cannot reach shading/filters without scroll + expand. *(ux, eng — M)*

2. **No spatial memory for color tools** — Expanding "More tools" does not change scroll position of header; users lose context when scrolling back to swatches. Tab model fixes one-scroll-per-mode. *(ux — M)*

### Warnings (P1) — meaningful friction or inconsistency

3. **Collapsed panel hides all affordances** — 40px strip shows only expand chevron; no icons for shading/filters/presets (`RightPalettePanel.tsx` L21–35). Casey and Morgan cannot discover features while collapsed. *(ui, eng — S)*

4. **Weak hierarchy in scroll stack** — `PaletteActions` uses three full-width labeled buttons between presets and buried tools; competes visually with presets grid and pushes tools down (mistake #7). *(ui — S)*

5. **Inconsistent tool chrome** — Left rail: icon + text via `toolButtonVariants`. Right panel: text sections + hidden disclosure. Users lack a recognizable "tool switch" pattern on the right. *(ui — S)*

6. **Morgan label gap on proposed icons** — Icon-only tabs need tooltip on hover **and** focus; `delayDuration` ≤ 300ms; tooltip text must equal `aria-label`. Screen readers get label without tooltip — document in a11y tests. *(ux, eng — S)*

7. **Read-only playback partial** — `ColorFiltersSection` respects `readOnly`; shading and palette edit do not show a unified playback banner. User may click disabled controls without explanation. *(ux — S)*

8. **Palette lock feedback on sub-tools** — Lock disables paint but shading `onSelectShade` silently returns when locked (`PaletteShadingSection.tsx` L26–28). Tab-level disabled state + tooltip preferred. *(ux — S)*

### Suggestions (P2) — polish and delight

9. **Session-persist active tab** — Remember last tab in `sessionStore` alongside `palettePanelWidth`. *(eng — S)*

10. **Active-state badges** — Dot on Filters tab when filters configured; optional on Shading when style ≠ default. *(ui — S)*

11. **Compact Edit tab** — Replace three full-width buttons with icon row (Plus / Pencil / Minus) + tooltips — matches proposed tab rail language. *(ui — S)*

12. **Optional width resize** — `palettePanelWidth` exists but no drag handle; Filters tab may feel tight at 240px with lighting sliders. Consider 280px max or horizontal resize later. *(eng — L)*

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — **Partial:** swatch pick yes; shading/filters no (buried)
- [x] State visible (loading/saved/error)? — Palette lock visible in header
- [x] Modals justified? — Color/remove dialogs appropriate
- [ ] Patterns consistent? — Left icon+label vs right scroll+details mismatch
- [ ] Overwhelming on first visit? — OK when collapsed; overwhelming when expanded + scrolled
- [ ] Edge cases designed? — Collapsed discoverability weak; read-only partial
- [ ] Hierarchy matches priority? — Flat section stack
- [ ] Beauty serves clarity? — Borders/sections clear but don't guide task order

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ⚠️ | Swatch path good; shading path broken |
| One decision per step | ⚠️ | Single column mixes pick + preset + edit + advanced |
| Progressive disclosure | ⚠️ | Over-disclosed via scroll; under-disclosed via `<details>` |
| Immediate feedback | ✅ | Swatch active ring; filter apply buttons |
| Forgiving (undo/autosave) | ✅ | Palette edits undoable; filter apply is explicit |
| Visual hierarchy | ❌ | Equal-weight sections |
| Flow tested end-to-end | ⚠️ | a11y test covers `<details>` keyboard only |

## Agreed recommendations

1. **Replace scroll stack + `PaletteMoreToolsSection` with sticky icon tab rail** — Tabs: Swatches, Presets, Edit, Shading, Filters. Independent scroll per tab. Remove `<details>`. **Owner:** eng + ui · **Effort:** M

2. **Implement icon tabs with Tooltip + `aria-label`** — Reuse `TooltipProvider` (already on `EditorPage`). Match left-rail active affordance (accent + 3px border, adapted to bottom border on tabs). **Owner:** ui + eng · **Effort:** S

3. **Collapsed strip: vertical icon shortcuts** — Same five icons with tooltips; expand panel and select tab on click. **Owner:** ui + eng · **Effort:** S

4. **Unified read-only + palette-lock states on tabs** — Disable Edit/Shading/Filters tabs (or show inline banner) when `readOnly` or `paletteLocked` where appropriate; tooltips explain why. **Owner:** ux + eng · **Effort:** S

5. **Compact Edit tab actions** — Icon row with tooltips instead of three full-width buttons to reduce vertical noise if Edit tab is opened from rail. **Owner:** ui · **Effort:** S

6. **Persist `lastPalettePanelTab` in sessionStore** — Restore on project open. **Owner:** eng · **Effort:** S

7. **Active badge on Filters tab** — When `hasActiveColorFilters()` or `placingLighting`. **Owner:** ui · **Effort:** S

8. **Update a11y tests** — Replace `PaletteMoreToolsSection` keyboard test with tab rail roving tabindex + tooltip label parity. **Owner:** eng · **Effort:** S

9. **Keep shading/filters on right panel** — Do not move to left rail; update DESIGN.md palette panel subsection to document tab rail pattern. **Owner:** ux · **Effort:** S

## Unresolved tension

- **Maya:** Morgan's "icon + text label always" on toolbar — should right-panel tabs show a **persistent micro-label** under icons (like left rail) at 240px width? That costs ~16px height per tab but improves workshop projector legibility.

- **Leo:** Icon-only + tooltip is cleaner and matches Figma/Photoshop panel icons; persistent labels make the rail ~72px tall and compete with swatch grid. **Proposed compromise:** icon-only at default width; if `palettePanelWidth ≥ 280` (or user setting "Show panel labels"), render 2-line icon+label tabs using shrunken `text-xs` — same `toolButtonVariants` pattern as left rail.

Product call recommended before implementation.

## Files reviewed

- `apps/web/src/shell/RightPalettePanel.tsx`
- `apps/web/src/shell/EditorLayout.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/components/palette/PaletteMoreToolsSection.tsx`
- `apps/web/src/components/palette/PaletteSwatchGrid.tsx`
- `apps/web/src/components/palette/PalettePresets.tsx`
- `apps/web/src/components/palette/PaletteActions.tsx`
- `apps/web/src/components/palette/PaletteShadingSection.tsx`
- `apps/web/src/components/palette/ShadingPalettePicker.tsx`
- `apps/web/src/components/palette/PaletteLock.tsx`
- `apps/web/src/components/filters/ColorFiltersSection.tsx`
- `apps/web/src/components/ui/Tooltip.tsx`
- `apps/web/src/components/ui/tool-button.ts`
- `apps/web/src/state/uiStore.ts`
- `apps/web/src/state/sessionStore.ts`
- `apps/web/src/content/copy.ts`
- `apps/web/src/a11y/sprintUiA11y.test.tsx`
- `UX.md`, `DESIGN.md`

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — mistakes #1, #5, #7, #9; practices #2–5, #8
- `UX.md` — Riley/Casey/Morgan personas, palette flows, session memory, toolbar a11y
- `DESIGN.md` — Editor shell layout, palette panel spec, tooltip usage, 40×40 targets, 0ms tool switch
