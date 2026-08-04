# UX/UI Design Critique — Select Tool Revamp (Product Director Refresh)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-04 |
| **Target** | Select tool performance + UX revamp — floating selection actions, move mode, C++ offload, partial repaint |
| **Files** | `apps/web/src/tools/selectTool.ts`, `apps/web/src/canvas/`, `apps/web/src/state/editorStoreClipboard.ts`, `apps/web/src/state/editorStorePaste.ts`, `apps/web/src/state/shortcuts.ts`, `apps/web/src/shell/StatusBar.tsx`, `apps/web/src/canvas/ZoomControls.tsx` |
| **Persona** | Riley (primary), Morgan (discoverability) |
| **Scope** | Implemented baseline + agreed revamp spec for synthesis |
| **Prior critique** | `.cursor/changelog/editor/20260804T051000_uxui-design-critique/` (superseded by this refresh) |
| **Product requirement** | Move, Copy, Cut, Paste under selection when pixels selected; C++ for heavy ops; frontend partial repaint |

## Job statement

When I have drawn a region of pixels I want to reposition or duplicate, I want to select it and act on it right where it sits on the canvas, so I can rearrange sprite parts without hunting menus or memorizing shortcuts.

## Golden path

Select tool (M) → drag marquee → **floating action bar appears under selection** → **Move** (drag inside selection or bar button) **or** Copy / Cut / Paste → confirm placement → selection updates or clears → undo if needed.

**Current golden path (implemented):** Select tool (M) → drag marquee → dashed outline animates → user must know Ctrl+C/X/V → paste preview follows pointer → Enter to place / Esc to cancel. **No drag-to-move. No on-canvas action controls.**

## Executive summary (for Taylor)

| Priority | Count | Theme |
|----------|------:|-------|
| **P0** | 3 | Move missing; keyboard-only edit actions; render jank undermines perf story |
| **P1** | 4 | Paste mode undiscoverable; cut/selection state mismatch; no slow-op feedback; inconsistent partial repaint |
| **P2** | 3 | Arrow nudge selection; duplicate-in-place; deselect affordance |

**Ship this loop:** `SelectionActionBar` (Move/Copy/Cut/Paste/Deselect + paste-active variant), move-selection command, partial repaint for selection/paste/move preview, status-bar loading for ops >100ms, C++ extract/move/paste endpoints.

**Cut this loop:** resize handles, OS clipboard, multi-selection, transform tools, Edit menu duplication, canvas-edge shimmer, duplicate action, selection dimension readout, icon+text labels on bar at all breakpoints.

## Persona impact matrix

| Finding | Riley | Morgan |
|---------|-------|--------|
| No move-selection | **Blocks** walk-cycle nudge workflow; forces cut→paste per frame | Students lose spatial context; teacher must explain keyboard dance |
| Keyboard-only copy/cut/paste | OK for power users who know shortcuts | **Fails** labeled-tool requirement; invisible to pointer-first students |
| Full-grid RAF on marching ants | Breaks flow on 64×64+ sprites; "feels broken" | Projector demo stutters; class loses attention |
| Implicit paste mode | Riley learns once; still friction vs Aseprite drag-move | **No visible Place/Cancel** — students click randomly |
| Cut leaves selection outline | Confusing during animation frame edits | "Did it work?" support tickets in workshop |

## Dialogue summary

**Maya:** Taylor's requirement is explicit: Move, Copy, Cut, Paste **under the selection** when pixels are selected. Today those four actions live only in `shortcuts.ts` — Morgan's students will never find them. Riley's job is "nudge this leg three pixels" across eight frames; cut→paste per frame is survivable but not shippable as "revamp."

**Leo:** Proximity is right; chrome must not compete with art. Reuse `ZoomControls` shell (`rounded-panel border-border bg-elevated/95 p-1 shadow-sm`). Bar appears only when `selection !== null`; icon-only with tooltips and shortcut badges. Move is primary focal state (accent ring when armed). **Scope cut:** no resize handles, no duplicate button, no dimension readout this loop — bar stays ≤5 controls.

**Maya:** Move mode needs two entry paths: pointer down inside selection bbox (Aseprite muscle memory) and Move button on bar (Morgan discoverability). Paste mode is a **distinct bar variant** — Place + Cancel replace the action row; status bar keeps `pasteModeHint` as secondary.

**Leo:** Performance is the other half of Taylor's brief. `useCanvasRenderState` runs full `renderGrid()` every RAF frame for marching ants; paste pointer-move triggers the same. Strokes already use `repaintGridCells` — selection overlay and paste preview must follow that path **before** C++ lands. During slow ops (>100ms), status bar shows "Moving selection…" / "Copying…" — never a modal. C++ endpoints are invisible except "it feels instant."

**Maya:** Agreed on scope cuts. Also defer: OS clipboard integration, multi-selection, transform/skew, Edit menu mirroring, fancy canvas shimmer. One undo step per move commit; Esc cancels preview. `readOnly` during playback hides bar entirely.

**Leo:** Unresolved (product call): icon-only bar vs icon+text at wide selections. Compromise — icons default; show text labels only when selection bbox width ≥120px (Morgan readability without cluttering 8×8 selections).

## Findings

### Critical (P0) — blocks task completion or trust

| # | Finding | Persona impact | Evidence |
|---|---------|----------------|----------|
| P0-1 | **No move-selection operation** | Riley: cannot drag-reposition; Morgan: no labeled Move affordance | `selectTool.ts` is marquee-only; no `moveSelection` in store |
| P0-2 | **Copy/cut/paste are keyboard-only** — violates product requirement | Riley: discoverable via `?` overlay only; Morgan: **fails** icon+label toolbar standard | No `SelectionActionBar`; `UndoRedoToolbar` is undo/redo only |
| P0-3 | **Selection/paste rendering triggers full-grid redraw** | Riley: jank on 64×64+ during animation edits; Morgan: stuttering projector demos | `useCanvasRenderState.ts` RAF loop → `renderGrid()`; strokes use `repaintGridCells` but selection does not |

### Warnings (P1) — meaningful friction or inconsistency

| # | Finding | Persona impact | Evidence |
|---|---------|----------------|----------|
| P1-1 | **Paste mode is implicit** — no Place/Cancel on canvas | Morgan: Enter/Esc undiscoverable; Riley: tolerable after first use | `pasteModeHint` in `StatusBar.tsx` only; `drawPastePreview` at 50% opacity |
| P1-2 | **Cut does not clear selection outline** — state mismatch | Morgan: "cut failed?" confusion; Riley: minor annoyance during frame workflow | `cutSelection` clears pixels; `commitPaste` calls `clearSelection`; outline persists after cut |
| P1-3 | **No feedback during slow ops** | Riley: trust breaks on 256×256 extract; Morgan: frozen UI looks like crash | `extractSelectionPixels` loops on main thread; no loading state |
| P1-4 | **Partial-repaint strategy inconsistent** | Riley: perf regression vs paint tool; eng debt before C++ | `repaintGridCells` exists for strokes; selection overlay bypasses it |

### Suggestions (P2) — polish and delight

| # | Finding | Persona impact | Evidence |
|---|---------|----------------|----------|
| P2-1 | Arrow-key nudge on active selection (pre-move) | Riley: pixel-perfect alignment without drag | Pattern exists in `nudgePastePreview` |
| P2-2 | Duplicate (copy-in-place offset) | Riley: common sprite workflow | Not in scope this loop |
| P2-3 | Deselect via tap-outside or × on bar | Morgan: clearer exit than switching tools | No deselect affordance today |

## Floating action bar spec

### Visibility rules

| Condition | Bar state |
|-----------|-----------|
| `selection !== null` && `!readOnly` && `pastePreview === null` | **Default:** Move, Copy, Cut, Paste (disabled if `clipboard === null`), Deselect |
| `pastePreview !== null` && `!readOnly` | **Paste-active:** Place (primary), Cancel, inline nudge hint |
| `readOnly` (playback) | Hidden |
| No selection | Hidden |

### Placement

- **Anchor:** Horizontally centered on selection bbox; **8px below** bottom edge (`spacing-2`).
- **Flip:** If bar would clip within 48px of frame strip / canvas bottom → render **above** selection.
- **Clamp:** `min-width: 10rem` (160px); horizontal position clamped inside canvas container minus 16px padding.
- **Coordinate space:** CSS pixels from `selectionBbox` + viewport (`panX`, `panY`, `zoom`) — same math as `drawSelectionOutline` in `renderer.ts`.
- **Z-index:** Highest in canvas container; `pointer-events-auto` on bar only.

### Default mode (selection active)

| Control | Icon | Label (`content/copy.ts`) | Shortcut badge | Role |
|---------|------|---------------------------|----------------|------|
| Move | `Move` | `selectionMove` | — | Primary; arms drag mode |
| Copy | `Copy` | `selectionCopy` | Ctrl+C | Ghost |
| Cut | `Scissors` | `selectionCut` | Ctrl+X | Ghost |
| Paste | `ClipboardPaste` | `selectionPaste` | Ctrl+V | Disabled if `clipboard === null` |
| — | divider | — | — | `border-border` |
| Deselect | `X` | `selectionDeselect` | Esc | Tertiary |

### Move mode

| Trigger | Behavior |
|---------|----------|
| Pointer down **inside** selection bbox (not on bar) | Start move preview; cursor `move` |
| Move button on bar | Arms same mode; accent ring on button |
| Drag | Update preview origin via partial repaint |
| Pointer up | Commit `MoveSelectionCommand` (single undo step) |
| Esc | Cancel preview; restore source |

**Render during move:** static dashed outline (pause marching-ants RAF); floating pixel buffer; `repaintGridCells` for source clear + destination preview cells only.

### Paste mode (bar variant)

Replaces default row when `pastePreview !== null`:

| Control | Role |
|---------|------|
| **Place** (primary, filled ghost + accent) | `commitPaste()` — Enter |
| **Cancel** (ghost) | `cancelPaste()` — Esc |
| Inline hint | `selectionPasteHint`: "Arrow keys to nudge · Enter to place" |

Pointer-move on canvas continues to update paste origin (`movePastePreview`). Arrow keys unchanged (`shortcuts.ts`). Status bar retains `pasteModeHint` as secondary.

### Visual tokens (DESIGN.md)

```text
Container: rounded-panel border-border bg-elevated/95 shadow-sm p-1 flex gap-1
Move active: ring-2 ring-accent on ghost button
Secondary:   Button variant ghost
Disabled:    opacity-50 pointer-events-none
Touch:       min-h-10 min-w-10 (40×40)
Tooltips:    shortcut badge in font-mono text-xs
Focus:       focus-visible:outline-2 focus-visible:outline-focus-ring
```

**Component home:** `apps/web/src/components/canvas/SelectionActionBar.tsx` — sibling overlay in `Canvas.tsx` container (pattern: `ZoomControls`).

### Proposed microcopy (`content/copy.ts`)

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
| `selectionCopying` | "Copying…" |
| `selectionPasteHint` | "Arrow keys to nudge · Enter to place" |
| `selectionCutPending` | "Cut — paste to place" |

## Performance UX

### Perceived latency targets

| Operation | Target | Feedback if >100ms |
|-----------|--------|---------------------|
| Marquee draw | <16ms/frame | `selectionPreview` (already OK) |
| Copy/cut extract | <50ms @ 64×64 | Status bar: `selectionCopying` |
| Move drag | <16ms/frame | Partial repaint only; pause marching ants |
| Paste preview drag | <16ms/frame | Partial repaint of clipboard bounds |
| Commit move/paste | <100ms | Disable bar primary + subtle spinner |

### Frontend partial repaint (ship before/alongside C++)

1. **Decouple marching ants from full grid** — overlay layer or bbox-region repaint only.
2. **Paste/move preview** — `repaintGridCells` for affected cells (extend stroke path in `renderer.ts`).
3. **RAF-coalesce** store updates during drag (pattern from stroke preview).
4. **Pause animation** during move/paste drag — static outline saves frames.

### C++ migration (invisible to users)

| Endpoint (proposed) | Replaces | UI unchanged |
|---------------------|----------|--------------|
| `POST .../selection/extract` | `extractSelectionPixels` | Copy/cut |
| `POST .../selection/move` | new | Atomic delta; one undo step |
| `POST .../selection/paste` | `buildPasteCellChanges` + apply | Commit preview |

- Return delta-encoded cell changes or frame blob; client applies optimistically.
- Local server — no blocking modal; in-flight flag on action bar.
- WASM/worker acceptable interim if API slips; still offload O(n) from main thread.

## What NOT to build this loop

Scope cuts agreed for Leo — defer to protect canvas-as-hero and loop velocity:

| Cut | Rationale |
|-----|-----------|
| Selection resize handles | New interaction model; v2 |
| OS clipboard / cross-app paste | Out of local-first v1 scope |
| Multi-selection / selection memory | Complexity explosion |
| Transform (rotate, skew, scale) | Different tool category |
| Duplicate-in-place button | Riley P2; cut+copy covers workaround |
| Selection dimension readout | Alex power feature; technical info later |
| Edit menu mirroring bar actions | Bar is the discovery surface |
| Canvas-edge progress shimmer | Status bar text sufficient |
| Icon+text labels on all bar buttons | Icons + tooltips default; labels only when bbox ≥120px |
| Fancy paste cursor modes | Ghost preview + bar variant enough |
| Separate "selection layers" | Anti-pattern for v1 |
| Blocking modal for large selections | Violates ux-seamless-flows #3 |
| Full C++ before partial repaint lands | Frontend win is independent; ship repaint first |

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — **No** (keyboard-only; Move missing)
- [x] State visible (loading/saved/error)? — Partial (paste hint; no loading)
- [x] Modals justified? — Yes (none for selection)
- [ ] Patterns consistent? — **Partial** (`ZoomControls` float exists; selection has none)
- [x] Overwhelming on first visit? — Yes (bar is progressive disclosure)
- [ ] Edge cases designed? — **Partial** (empty clipboard, large selection perf)
- [ ] Hierarchy matches priority? — **No** (marching ants compete with art)
- [ ] Beauty serves clarity? — **Partial** (animation costly)

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ❌ | Move missing; cut/paste multi-step |
| One decision per step | ⚠️ | Paste mode bundles move+place |
| Progressive disclosure | ✅ | Bar when `selection !== null` only |
| Immediate feedback | ❌ | Full redraws; no slow-op indicator |
| Forgiving (undo/autosave) | ✅ | Commands undoable; Esc cancels |
| Visual hierarchy | ⚠️ | Canvas hero OK; actions hidden |
| Flow tested end-to-end | ❌ | No pointer path for copy/move |

## Agreed recommendations

1. **Add `SelectionActionBar`** — default + paste-active variants; collision-aware placement; reuses `ZoomControls` token stack. **Owner:** ui + eng · **Effort:** M · **Personas:** Morgan (discovery), Riley (speed)

2. **Implement move-selection** — drag inside bbox or Move button → preview → single undo commit; wire bar. **Owner:** eng + ux · **Effort:** L · **Personas:** Riley (P0)

3. **Partial repaint for selection/paste/move** — stop full-grid RAF for marching ants; extend `repaintGridCells`. **Owner:** eng · **Effort:** M · **Personas:** Riley (perf), Morgan (demo stability)

4. **C++ selection endpoints** — extract/move/paste offload; UI behavior unchanged. **Owner:** eng · **Effort:** L · **Personas:** Riley (large sprites)

5. **Slow-op status feedback** — `selectionMoving` / `selectionCopying` in status bar when >100ms. **Owner:** ux + eng · **Effort:** S

6. **Cut state clarity** — clear selection after cut OR show `selectionCutPending` on bar. **Owner:** ux + eng · **Effort:** S · **Personas:** Morgan

7. **Shortcut badges in tooltips** — Ctrl+C/X/V on bar buttons; `ShortcutsOverlay` stays canonical. **Owner:** ux · **Effort:** S

## Unresolved tension

- **Maya:** icon + text labels on every bar button (Morgan parity with tool rail). **Leo:** icon-only compact bar; compromise — labels when selection bbox width ≥120px.

## Files reviewed

- `apps/web/src/tools/selectTool.ts`
- `apps/web/src/tools/useToolInput.ts`
- `apps/web/src/canvas/Canvas.tsx`
- `apps/web/src/canvas/renderer.ts`
- `apps/web/src/canvas/useCanvasRenderState.ts`
- `apps/web/src/canvas/selectionGeometry.ts`
- `apps/web/src/canvas/selectionExtraction.ts`
- `apps/web/src/canvas/ZoomControls.tsx`
- `apps/web/src/state/editorStoreClipboard.ts`
- `apps/web/src/state/editorStorePaste.ts`
- `apps/web/src/state/editorStoreSelection.ts`
- `apps/web/src/state/shortcuts.ts`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/components/toolbar/UndoRedoToolbar.tsx`
- `apps/web/src/components/onboarding/ShortcutsOverlay.tsx`
- `apps/web/src/content/copy.ts`
- `e2e/linkedin-media.helpers.ts` — select/copy/paste golden path
- `UX.md` — Riley, Morgan personas
- `DESIGN.md` — tokens, canvas hero, touch targets

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — mistakes #1, #2, #5, #7, #10; practices #2–6, #8
- `UX.md` — Riley walk-cycle job; Morgan labeled tools + touch targets
- `DESIGN.md` — `bg-elevated/95`, `rounded-panel`, canvas hero, 40×40 touch
- Prior critique: `.cursor/changelog/editor/20260804T051000_uxui-design-critique/`
