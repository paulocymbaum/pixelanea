# UX/UI Design Critique — Editor Canvas (Zoom, Paint Performance, Undo/Redo)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Target** | Editor canvas workspace — `Canvas.tsx`, `ZoomControls.tsx`, `coordinates.ts`, `editorStore.ts`, `undoStack.ts`, `UndoRedoToolbar.tsx`, `renderer.ts`, `paintTool.ts`, `shortcuts.ts`, `ShortcutsOverlay.tsx`, `StatusBar.tsx` |
| **Persona** | Riley (primary) — hobby game dev, aggressive painter |
| **Scope** | Implemented UI with three user-reported P0 issues |

## Job statement

When I am blocking out sprite art on a high-resolution grid, I want to zoom freely, paint without lag, and undo any mistake on the editor screen, so I can stay in flow and ship a walk cycle this week.

## Golden path

Open project → canvas focused with fit-to-view → pick color (1–9) → paint/erase on grid → scroll to zoom for detail → Ctrl+Z to fix mistakes → switch frames / export

## Dialogue summary

**Maya:** Riley's job breaks at three trust points: can't see pixels (zoom), can't keep up while painting (lag), can't recover mistakes (undo scope). All three are P0 for the product promise in UX.md — *"Mistakes are cheap"* and *"Instant feedback, no lag."*

**Leo:** Zoom chrome exists (`ZoomControls` bottom-right, mono % readout) but DESIGN.md also puts zoom in `StatusBar` — that slot is empty today. Visual feedback for zoom is split: working % in a floating pill vs. documented status bar vs. shortcuts overlay showing em-dashes for zoom keys.

**Maya:** The `pointer-events-none` wrapper around `ZoomControls` is probably *not* the sole culprit — the child has `pointer-events-auto`, which is valid CSS. More likely: (1) wheel `preventDefault` may be ignored on passive listeners, (2) `fitToView` re-fires on resize and grid-dimension effects, snapping zoom back, (3) zoom keyboard shortcuts promised in UX.md but not implemented (`ShortcutsOverlay` VIEW_ROWS use `"—"`).

**Leo:** Agree on multi-cause zoom. I'd add missing `z-index` on the control stack — canvas is full-bleed; controls rely on paint order only. Fit-to-view on every `ResizeObserver` callback is hostile to Riley resizing a panel.

**Maya:** Painting lag is architectural UX: `paintTool` dispatches one `PaintCellCommand` per cell; each `dispatch()` clones the full `Uint8Array` and `renderer.ts` redraws every non-transparent cell. At 256×256 that's perceptible lag — violates UX.md *"Instant feedback, no lag"* and mistake #6 (no proportional feedback under load).

**Leo:** Cursor is tool-appropriate (`crosshair` via `getToolCursor`) but there's no stroke-level feedback — no optimistic partial render, no batched undo. The canvas *looks* frozen while the main thread churns.

**Maya:** Undo discoverability is fine — `UndoRedoToolbar` above canvas, labels + icons, Ctrl+Z wired in `shortcuts.ts`. The gap is **honest scope**: undo only covers pixel `Command` objects from `dispatch()`. Palette add/remove/preset, color-filter placement, frame switch (`switchFrame` clears stacks), frame duplicate/reorder — all bypass undo. User expectation of *"everything on this screen"* ≠ implementation.

**Leo:** Toolbar says "Edit history" (`copy.undoRedoToolbarLabel`) which over-promises. Buttons disable silently when stack empty — no tooltip explaining *why*. UX.md says cap 500; nothing surfaces when history truncates.

**Maya:** Empty canvas hint (`copy.emptyCanvasHint`) is good first-visit guidance but doesn't mention scroll-to-zoom — missed teachable moment while Riley stares at a tiny 256×256 fit.

**Leo:** Converge: P0 eng fixes for zoom reliability + paint perf; P1 UX for undo scope messaging and zoom discoverability; P2 polish (status bar zoom, stroke-grouped undo).

## Findings

### Critical (P0) — blocks task completion or trust

- **Zoom unreliable or appears broken** — User reports wheel and buttons ineffective. Code has wheel handler (`Canvas.tsx` `handleWheel`) and store actions (`editorStore.ts` `zoomIn`/`zoomOut`), but `fitToView` is also called on mount, resize (`ResizeObserver`), and `gridWidth`/`gridHeight` changes — any of these can reset viewport after user zoom. Zoom keyboard shortcuts promised in UX.md § Interaction patterns ("Scroll / shortcuts") are not in `shortcuts.ts`; overlay shows `"—"` placeholders. Wheel zoom may fail silently if `preventDefault` is ineffective on passive wheel listeners.
- **High-res painting feels broken** — Each painted cell triggers full pixel-buffer copy + full-grid canvas redraw (`dispatch` → `drawPixels` nested loops). Many distinct cells on large grids produce severe lag; Riley interprets this as the editor not working.
- **Undo scope mismatch with user mental model** — Users expect full editor-screen history; only pixel mutations via `dispatch()` are undoable. Palette changes, color filters, frame operations, and `switchFrame` (clears stacks at `editorStore.ts` ~381–382) are not. A single drag stroke creates one undo entry per cell, not one per gesture — feels "incomplete" even for paint.

### Warnings (P1) — meaningful friction or inconsistency

- **Undo/redo over-promises** — Toolbar `aria-label` is "Edit history" but history is pixel-only, per-cell, per-frame. No in-app explanation of scope or cap (500).
- **Zoom discoverability gap** — No first-run hint that scroll zooms; empty-state copy only mentions click/drag. Zoom % only in bottom-right floater; `StatusBar.tsx` shows hover coords and sync status but not zoom (DESIGN.md § Editor shell lists zoom in status bar).
- **Resize fights zoom intent** — Panel collapse/expand triggers `fitToView` via resize observer, undoing deliberate zoom without warning.
- **Button zoom lacks anchor** — `ZoomControls` calls `zoomIn()`/`zoomOut()` without viewport anchor; wheel zoom uses cursor anchor. Inconsistent focal point may make button zoom feel wrong even when state updates.
- **Playback blocks undo** — `readOnly` during animation play disables undo (`useCanUndo`); no visible explanation.

### Suggestions (P2) — polish and delight

- Add zoom to status bar for persistent, low-chrome feedback (matches DESIGN.md).
- Implement zoom shortcuts (`+`/`-`/`0` or `Ctrl+scroll` parity) and update `ShortcutsOverlay` VIEW_ROWS.
- Group stroke commands into single undo steps (pointer-down → pointer-up batch).
- Subtle zoom transition or brief % toast on change for accessibility (`aria-live` on % span already exists in `ZoomControls`).
- Empty-canvas hint: append "Scroll to zoom" once per session.
- Consider dirty-region or ImageData caching in renderer for large grids.

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — Paint yes; zoom secondary and undiscoverable without scroll trial
- [x] State visible (loading/saved/error)? — Sync status in status bar; zoom state only in floater
- [x] Modals justified? — N/A for canvas interactions
- [ ] Patterns consistent? — UX.md promises zoom shortcuts; UI shows dashes; DESIGN.md status bar ≠ implementation
- [x] Overwhelming on first visit? — Chrome is restrained; empty hint helps
- [ ] Edge cases designed? — High-res lag, undo scope, resize-reset zoom undertreated
- [ ] Hierarchy matches priority? — Canvas hero yes; zoom controls small ghost buttons, easy to miss
- [ ] Beauty serves clarity? — Zoom floater is clean but may be non-interactive if stacking/wheel issues persist

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ⚠️ | Paint path works; zoom + undo break Riley's detail-and-fix loop |
| One decision per step | ✅ | Tools are discrete |
| Progressive disclosure | ✅ | Frame strip hidden until needed |
| Immediate feedback | ❌ | Paint lag on large grids; zoom may not visibly respond |
| Forgiving (undo/autosave) | ❌ | Undo scope far narrower than "editor screen" expectation |
| Visual hierarchy | ⚠️ | Canvas hero; zoom/undo chrome recedes perhaps too far |
| Flow tested end-to-end | ❌ | High-res paint + zoom resize + palette edit → undo exposes gaps |

## Agreed recommendations

Prioritized for Taylor (Product Director):

1. **Fix zoom end-to-end** — Verify wheel (non-passive listener), button hit targets (`z-index` + stacking), and stop aggressive `fitToView` on every resize; only fit on open/grid-size change unless user clicks Fit. **Owner:** eng · **Effort:** M
2. **Batch paint strokes + optimize redraw** — Coalesce pointer-drag cells into one `PaintCellsCommand` per stroke; explore dirty rects or offscreen buffer for renderer. **Owner:** eng · **Effort:** L
3. **Honest undo scope + expand coverage** — Short term: microcopy ("Undoes paint strokes on this frame") and tooltip when disabled; medium term: command-wrap palette/frame/filter ops or document irreversible actions inline. **Owner:** ux + eng · **Effort:** M (copy) / L (full history)
4. **Implement zoom shortcuts** — Wire `+`/`-`/Fit per UX.md; update `ShortcutsOverlay` from `"—"` to real keys. **Owner:** eng · **Effort:** S
5. **Surface zoom in status bar** — Mirror `formatZoomPercent(zoom)` in `StatusBar.tsx` per DESIGN.md. **Owner:** ui · **Effort:** S
6. **Teach scroll-to-zoom** — Extend empty canvas hint or one-time coach mark: "Scroll to zoom." **Owner:** ux · **Effort:** S
7. **Stroke-level undo** — Merge per-cell commands during drag so Ctrl+Z matches gesture memory. **Owner:** eng · **Effort:** M

## Unresolved tension

**Maya** wants full "everything on this screen" undo (palette, frames, filters) to match user report and Morgan's classroom recovery needs. **Leo** warns that global undo balloons UI complexity and conflicts with "canvas is hero" — prefers honest scope labels now and phased command coverage. **Product call:** Is v1 undo "pixel edits on active frame" (documented) or "all editor mutations" (user expectation)?

Secondary: **Leo** argues fit-to-view on panel resize is correct for canvas sovereignty; **Maya** says it destroys zoom muscle memory — compromise: fit only on explicit Fit click or first open.

## Files reviewed

- `apps/web/src/canvas/Canvas.tsx`
- `apps/web/src/canvas/ZoomControls.tsx`
- `apps/web/src/canvas/coordinates.ts`
- `apps/web/src/canvas/renderer.ts`
- `apps/web/src/state/editorStore.ts`
- `apps/web/src/state/commands/undoStack.ts`
- `apps/web/src/state/commands/types.ts`
- `apps/web/src/state/commands/paintCells.ts`
- `apps/web/src/state/shortcuts.ts`
- `apps/web/src/tools/paintTool.ts`
- `apps/web/src/tools/useToolInput.ts`
- `apps/web/src/components/toolbar/UndoRedoToolbar.tsx`
- `apps/web/src/components/onboarding/ShortcutsOverlay.tsx`
- `apps/web/src/shell/EditorLayout.tsx`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/content/copy.ts`
- `UX.md` (Interaction patterns, Creative freedom, Riley persona)
- `DESIGN.md` (Editor shell, zoom spec, status bar)

## References

- ux-seamless-flows skill — mistakes 2, 6, 10, 11; practices 6, 7, 10
- UX.md — § Interaction patterns (Paint, Undo, Zoom), § Creative freedom ("Non-destructive confidence", "Instant feedback")
- DESIGN.md — § Editor shell layout, zoom range 25%–3200%, status bar spec
