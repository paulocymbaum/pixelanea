# UX/UI Design Critique — Select Tool & Selection Actions

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-04 |
| **Target** | Select tool, selection clipboard flows, canvas overlays — `apps/web/src/tools/selectTool.ts`, `apps/web/src/canvas/`, `apps/web/src/state/editorStoreClipboard.ts`, `apps/web/src/state/editorStorePaste.ts`, `apps/web/src/state/shortcuts.ts`, `apps/web/src/shell/StatusBar.tsx`, `apps/web/src/components/toolbar/UndoRedoToolbar.tsx` |
| **Persona** | Riley (primary), Morgan (discoverability), Casey (pointer-first) |
| **Scope** | Implemented UI + proposed revamp (floating action bar, move, C++ performance path) |

## Job statement

When I have drawn a region of pixels I want to reposition or duplicate, I want to select it and act on it right where it sits on the canvas, so I can rearrange sprite parts without hunting menus or memorizing shortcuts.

## Golden path

Select tool (M) → drag marquee → **floating action bar appears under selection** → Move (drag handle or button) **or** Copy / Cut / Paste → confirm placement → selection updates or clears → undo if needed.

**Current golden path (implemented):** Select tool (M) → drag marquee → dashed outline animates → user must know Ctrl+C/X/V → paste preview follows pointer → click or Enter to place → Esc to cancel. **No drag-to-move.** No on-canvas action controls.

## Dialogue summary

**Maya:** Riley's job is "nudge this eye three pixels left" — not "open the shortcuts overlay and remember Ctrl+X then Ctrl+V." Today copy/cut/paste exist only as keyboard shortcuts (`shortcuts.ts`) with a status-bar modifier hint (`selectToolHint`) and paste hint (`pasteModeHint`). Morgan's students will never find that. The primary action after selecting should be obvious at the selection — move first, then copy/cut/paste as secondary icon buttons.

**Leo:** Agree on proximity, but the bar must not compete with the artwork. DESIGN.md already has a floating chrome pattern in `ZoomControls` — `rounded-panel border border-border bg-elevated/95 p-1 shadow-sm`. Reuse that shell: a compact horizontal pill **below** the selection bbox (8px gap), not centered on pixels. Icon-only with `aria-label` + tooltip; optional `text-sm` labels in a "show labels" accessibility mode. Primary = Move (filled ghost with accent ring when active); Copy/Cut/Paste = ghost icons. Show shortcut badges on hover (`Ctrl+C`) in `font-mono text-xs`.

**Maya:** Move doesn't exist yet — that's a P0 gap for the stated revamp. Users who select expect drag-inside-to-move (Photoshop, Aseprite, Piskel). Without it, "Move" in the floating bar is the anchor feature that justifies the UI.

**Leo:** For move UX: dragging the selection interior moves pixels; dragging the outline resizes only if we add handles later (v2). During move, show a **static** dashed outline — kill the continuous marquee animation during drag to save frames. Selection outline animation (`useCanvasRenderState` RAF loop) currently redraws the **entire grid** every frame; that's likely why selection feels slow before we even move.

**Maya:** Paste-after-cut is a multi-step state machine (`startPastePreview` → `movePastePreview` → `commitPaste`) with no visual affordance except semi-transparent preview (`PASTE_PREVIEW_OPACITY = 0.5`). Status bar helps power users; Casey needs the floating bar to switch to "Place paste" mode with explicit **Place** and **Cancel** buttons plus the existing arrow-key path surfaced inline.

**Leo:** Performance UX: any op >100ms needs feedback. Large selections on 256×256 mean `extractSelectionPixels`, `buildPasteCellChanges`, and `drawPastePreview` all loop O(width×height) in JS on the main thread. Show a subtle canvas-edge progress shimmer or status-bar "Moving selection…" — never block with a modal. Optimistic UI: during move preview, render only the floating pixels layer (like stroke `repaintGridCells`), not full `renderGrid`.

**Maya:** C++ migration should be invisible to users except "it feels instant." Contract: `POST /frames/{id}/selection/extract`, `.../move`, `.../paste` returning updated blob or delta. UI keeps the same floating bar; eng swaps the store actions.

**Leo:** Unresolved: icon+label below icon (tool-rail convention) vs horizontal icon-only bar under selection. For a 12×12 selection the bar may be wider than the selection — clamp to min-width 160px and center under bbox, flip above if near bottom edge (collision with frame strip).

## Findings

### Critical (P0) — blocks task completion or trust

- **No move-selection operation.** Selection is marquee-only (`selectTool.ts`); there is no `moveSelection`, drag-inside handler, or move command. Users cannot reposition selected pixels without cut→paste, which clears source and adds steps.
- **Copy/cut/paste are keyboard-only.** No toolbar buttons, no Edit menu entries, no on-canvas controls. Violates ux-seamless-flows mistake #1 (unclear primary action) and #5 (discoverability for Morgan/Casey).
- **Selection/paste rendering is main-thread heavy.** Continuous selection-dash animation triggers full `renderGrid()` per frame (`useCanvasRenderState.ts` lines 321–356). Paste pointer-move calls `movePastePreview` → store update → full redraw. Large selections will jank — undermines "instant feedback" in UX.md drawing table.

### Warnings (P1) — meaningful friction or inconsistency

- **Paste mode is implicit.** After Ctrl+V, only status text (`pasteModeHint`) and ghost preview communicate state. No Place/Cancel buttons; Enter/Esc are undiscoverable.
- **Cut does not clear selection** after cut (clipboard populated, pixels cleared via command) — selection outline remains until paste commits (`commitPaste` calls `clearSelection`). User may think cut failed.
- **Toast-only feedback for copy/cut** (`selectionCopied`, `selectionCut`) — easy to miss; no persistent "clipboard has content" indicator.
- **Inconsistent partial-repaint strategy.** Active strokes use `repaintGridCells`; selection overlay and paste preview do not — missed optimization opportunity before C++.
- **Ellipse/square modifier hints live only in status bar** (`Shift: square · Shift+C: circle`) — not visible during drag when eyes are on canvas.

### Suggestions (P2) — polish and delight

- **Nudge selected region** with arrow keys when selection active (before move mode) — mirrors paste nudge pattern already in `shortcuts.ts`.
- **Selection size readout** in floating bar footer (`24×18`) using `text-mono` for Alex; gated behind View → technical info.
- **Duplicate** action (copy-in-place offset) as Riley shortcut — common sprite workflow.
- **Deselect** tap-outside or small × on bar — clearer than switching tools.

## Current state audit

| Area | Implementation | UX gap |
|------|----------------|--------|
| Select tool | `selectTool.ts` — pointer down/up marquee; Shift/C modifiers for square/ellipse | No move, no floating UI |
| Selection render | `drawSelectionOutline` in `renderer.ts`; animated dash via RAF | Full canvas redraw each frame |
| Clipboard | `editorStoreClipboard.ts` — JS `extractSelectionPixels`, `buildClearSelectionCellChanges` | Main-thread loops; no UI trigger |
| Paste | `editorStorePaste.ts` — preview + `commitPaste` via `PasteCellsCommand` | No on-canvas Place/Cancel; slow preview |
| Shortcuts | `shortcuts.ts` — Ctrl+C/X/V, arrows, Enter, Esc | Documented in `?` overlay only |
| Chrome | `UndoRedoToolbar` — undo/redo only; `StatusBar` — hints; `LeftToolRail` — select tool toggle | No edit actions in chrome |
| C++ server | No selection/clipboard endpoints | All pixel ops client-side |

## Recommended floating action bar

### Placement

- **Anchor:** Horizontally centered on selection bbox; **8px below** bottom edge (`spacing-2`).
- **Flip:** If bar would clip canvas bottom (within 48px of frame strip), render **above** selection.
- **Clamp:** `min-width: 10rem` (160px); max-width does not exceed canvas width minus 16px padding.
- **Coordinate space:** Position in canvas container CSS pixels using `selectionBbox` + viewport (`panX`, `panY`, `zoom`) — same math as `drawSelectionOutline`.
- **Pointer events:** `pointer-events-auto` on bar only; canvas remains interactive for drag-move on selection body.

### Structure (left → right)

| Control | Icon (Lucide) | Label (`content/copy.ts`) | Shortcut badge | Role |
|---------|---------------|---------------------------|----------------|------|
| Move | `Move` | "Move" | — | Primary; toggles drag mode |
| Copy | `Copy` | "Copy" | Ctrl+C | Secondary ghost |
| Cut | `Scissors` | "Cut" | Ctrl+X | Secondary ghost |
| Paste | `ClipboardPaste` | "Paste" | Ctrl+V | Disabled if `clipboard === null` |
| Divider | — | — | — | `border-border` |
| Cancel | `X` | "Deselect" | Esc | Tertiary; clears selection |

**Paste-active variant:** Replace row with **Place** (primary, Enter) + **Cancel** (Esc) + nudge hint `text-xs text-secondary`: "Arrow keys to nudge."

### Affordances

- **Move:** Pointer down inside selection (not on bar) starts move preview; drag updates origin; pointer up commits `MoveSelectionCommand` (single undo step). Bar Move button arms the same mode (cursor `move`).
- **Touch:** 40×40 min targets per DESIGN.md; bar buttons use `min-h-10 min-w-10` matching `UndoRedoToolbar`.
- **Keyboard:** Existing shortcuts unchanged; bar is additive discovery, not replacement.
- **readOnly:** Hide bar during playback (`readOnly` true).

### Visual spec (DESIGN.md tokens)

```text
Container: rounded-panel border-border bg-elevated/95 shadow-sm p-1
           flex items-center gap-1
Primary:   Button variant ghost + ring-2 ring-accent (move active)
Secondary: Button variant ghost, text-primary
Disabled:  opacity-50 pointer-events-none
Tooltips:  TooltipContent bg-elevated text-sm text-secondary
Shortcuts: kbd rounded border-border bg-surface font-mono text-xs
Focus:     focus-visible:outline-2 focus-visible:outline-focus-ring
```

Component home: `apps/web/src/components/canvas/SelectionActionBar.tsx` — sibling overlay inside `Canvas.tsx` container (pattern: `ZoomControls`).

## Performance UX

### Perceived latency targets

| Operation | Target | Feedback if exceeded (~100ms) |
|-----------|--------|-------------------------------|
| Marquee draw | <16ms/frame | Already previewed via `selectionPreview` |
| Copy/cut extract | <50ms @ 64×64 | Status: "Copying…" in status bar |
| Move drag | <16ms/frame | Partial canvas repaint only |
| Paste preview drag | <16ms/frame | Partial repaint of clipboard bounds |
| Commit paste/move | <100ms | Disable bar + spinner on primary button |

### Optimistic UI (client, before C++)

1. **Decouple selection outline from full grid redraw** — draw marching ants in an overlay canvas layer or repaint bbox region only.
2. **Paste/move preview** — maintain floating pixel buffer; call `repaintGridCells` for affected cells only (extend `renderer.ts` like stroke path).
3. **RAF-coalesce** `movePastePreview` store updates (already partially done for strokes).

### C++ migration path (eng)

| Endpoint (proposed) | Replaces | UI behavior unchanged |
|---------------------|----------|------------------------|
| `POST .../selection/extract` | `extractSelectionPixels` | Copy/cut return clipboard blob |
| `POST .../selection/move` | new | Atomic cut+paste at delta; one undo step |
| `POST .../selection/paste` | `buildPasteCellChanges` + apply | Commit preview |

- Return **delta-encoded cell changes** or full frame blob; client applies optimistically then reconciles.
- Worker thread or WASM acceptable interim if API not ready — still offload O(n) loops from main thread.
- **Do not** block UI waiting for network on local server; use in-flight flag on action bar.

## Visual hierarchy and microcopy

| Element | Treatment |
|---------|-----------|
| Selection outline | Functional black/white dash — stays on canvas layer |
| Floating bar | Elevated chrome — highest z-index in canvas container |
| Move (active) | `accent` ring — one focal interactive state |
| Copy/Cut/Paste | Equal ghost weight — no competing filled buttons |
| Hints | `text-sm text-secondary` in status bar; bar tooltips for modifiers |

**Proposed copy** (`content/copy.ts`):

| Key | String |
|-----|--------|
| `selectionActionBarLabel` | "Selection actions" |
| `selectionMove` | "Move" |
| `selectionCopy` | "Copy" |
| `selectionCut` | "Cut" |
| `selectionPaste` | "Paste" |
| `selectionPlace` | "Place" |
| `selectionDeselect` | "Deselect" |
| `selectionMoving` | "Moving selection…" |
| `selectionPasteHint` | "Arrow keys to nudge · Enter to place" |
| `selectionModifierHint` | "Shift: square · Shift+C: circle" (move to tooltip on select tool, keep in status bar) |

Voice: plain, outcome verbs — per DESIGN.md ("Copied." not "Awesome!").

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — **No** (keyboard-only edit actions)
- [x] State visible (loading/saved/error)? — Partial (paste hint in status bar; no loading)
- [x] Modals justified? — Yes (none used for selection)
- [ ] Patterns consistent? — **Partial** (zoom float vs no selection float)
- [x] Overwhelming on first visit? — Yes (no extra chrome until selection)
- [ ] Edge cases designed? — **Partial** (empty clipboard paste, large selection perf)
- [ ] Hierarchy matches priority? — **No** (outline anim competes with art)
- [ ] Beauty serves clarity? — **Partial** (animation costly)

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ❌ | Move missing; cut/paste multi-step |
| One decision per step | ⚠️ | Paste mode bundles move+place |
| Progressive disclosure | ✅ | Bar appears only when `selection !== null` |
| Immediate feedback | ❌ | Full redraws; no loading on large ops |
| Forgiving (undo/autosave) | ✅ | Commands undoable; Esc cancels paste |
| Visual hierarchy | ⚠️ | Canvas hero OK; actions too hidden |
| Flow tested end-to-end | ❌ | No pointer path for copy/move |

## Agreed recommendations

1. **Add `SelectionActionBar` floating under selection bbox** — Move, Copy, Cut, Paste, Deselect; paste-active variant with Place/Cancel. Reuse `ZoomControls` / `UndoRedoToolbar` token stack. **Owner:** ui + eng · **Effort:** M

2. **Implement move-selection as first-class operation** — drag inside selection or Move button → preview → commit single undo step; cut+clear source optional for true move vs copy-move. Wire floating bar Move button. **Owner:** eng + ux · **Effort:** L

3. **Fix render performance before/alongside C++** — (a) stop full-grid RAF for marching ants; (b) partial repaint for paste/move preview; (c) offload extract/paste loops to C++ API or worker. Show status-bar progress for ops >100ms. **Owner:** eng · **Effort:** L

4. **Surface keyboard shortcuts on bar tooltips** — `Ctrl+C`, `Ctrl+V`, etc. in `TooltipContent`; keeps `ShortcutsOverlay` as canonical list. **Owner:** ux · **Effort:** S

5. **Clear selection after cut** or show "Cut — paste to place" badge on bar so outline state matches clipboard. **Owner:** ux + eng · **Effort:** S

6. **Collision-aware bar placement** — flip above selection near bottom; clamp horizontal position inside canvas container. **Owner:** ui · **Effort:** S

## Unresolved tension

- **Maya** wants icon + text labels on every bar button (Morgan parity with tool rail). **Leo** prefers icon-only compact bar with tooltips to avoid obscuring small selections; compromise: icons default, labels at `sm:` breakpoint or when selection width > 120px.

## Files reviewed

- `apps/web/src/tools/selectTool.ts`
- `apps/web/src/tools/useToolInput.ts`
- `apps/web/src/canvas/Canvas.tsx`
- `apps/web/src/canvas/renderer.ts`
- `apps/web/src/canvas/useCanvasRenderState.ts`
- `apps/web/src/canvas/selectionGeometry.ts`
- `apps/web/src/canvas/selectionExtraction.ts`
- `apps/web/src/state/editorStoreClipboard.ts`
- `apps/web/src/state/editorStorePaste.ts`
- `apps/web/src/state/editorStoreSelection.ts`
- `apps/web/src/state/shortcuts.ts`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/shell/EditorLayout.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/components/toolbar/UndoRedoToolbar.tsx`
- `apps/web/src/canvas/ZoomControls.tsx`
- `apps/web/src/components/onboarding/ShortcutsOverlay.tsx`
- `apps/web/src/content/copy.ts`
- `UX.md` — personas, interaction patterns
- `DESIGN.md` — tokens, toolbar, canvas rules, layout

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — mistakes #1, #2, #5, #7, #10; practices #2–6, #8
- `UX.md` — Riley jobs-to-be-done, drawing immediacy, Morgan labeled tools
- `DESIGN.md` — `bg-elevated/95`, `rounded-panel`, touch targets, canvas hero rule, ZoomControls pattern
