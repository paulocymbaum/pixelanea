# Loop Backlog — Select Tool + Copy/Paste with Floating Paste Preview

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | editor |
| **Trigger** | Product refinement request for new Select tool with rectangular/square/ellipse modes and copy/paste with confirmable floating preview |
| **Horizon** | Next implementation loop (P0 batch shippable standalone) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Pixelanea's editor has six paint tools (`paint`, `eraser`, `eyedropper`, `fill`, `line`, `hand`) registered in `apps/web/src/tools/registry.ts` with no selection or clipboard support. Input routing in `useToolInput.ts` separates stroke tools (`paint`/`eraser` via `StrokeSession`) from pointer-up tools like `lineTool.ts`. Commands follow a pure `apply`/`revert` model (`PaintCellsCommand`); undo is client-side with a 500-entry cap (`editorStoreCommands.ts`). `editorStore.ts` holds no selection or clipboard state; `shortcuts.ts` has no copy/paste bindings. The feature is **frontend-only** — no OpenAPI or C++ changes required. UX.md positions Riley (hobby game dev) as primary persona; duplicating sprite regions is a core job-to-be-done for walk-cycle workflows.

## Dialogue summary

- **Goals:** Riley needs to copy a limb or face tile and reposition it across frames without repainting. Done = select region on release → copy → move preview → confirm → undoable paste. Canvas stays hero; no modal confirm dialog.
- **Feasibility:** Jordan confirmed `lineTool` drag pattern and `PaintCellsCommand` reuse; paste preview can mirror `strokePreview.ts`. Ellipse selection is a bounded-box scan with standard ellipse inequality — no backend. Main risk is input-state machine (select drag vs paste mode vs hand pan) and rendering a non-pixel selection overlay.
- **Batching:** Sam pushed for full modifier set in one release; Jordan cut ellipse + square to Batch 2 so Batch 1 ships rect select + copy/paste + undo. Cut, cross-frame paste, and OS clipboard deferred to Batch 3.
- **RICE:** Batch 1 wins decisively (core job). Batch 2 is polish/modifier parity. Sam accepted deferral because rect covers ~80% of Riley's duplicate-region cases.

## Batched tasks

Tasks grouped by batch. **Scope** is `frontend` unless noted.

### Batch 1 — P0: Rect select + copy/paste + undo (Must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Add `selection` slice to `editorStore` (`mode: idle \| selecting \| selected`, `anchor`, `bounds`, `cells: CellCoord[]`) + actions (`clearSelection`, `setSelection`, `beginSelecting`) | frontend | Selection must survive tool switches and drive copy/paste; store is single source for canvas overlay | — |
| B1-02 | Implement `selectTool.ts`: pointer-down stores anchor; pointer-move previews bounds; pointer-up commits selection (min 1×1 cell) | frontend | Matches user intent "select on mouse release"; follows `lineTool` drag lifecycle | B1-01 |
| B1-03 | Selection overlay renderer (dashed marquee on canvas, viewport-aware) — separate from pixel `strokePreview` | frontend | Selection is chrome overlay, not committed pixels; DESIGN.md viewport vs chrome split | B1-02 |
| B1-04 | Extend `useToolInput.ts` for drag tools with move preview (select, later paste-reposition) without `StrokeSession` | frontend | Current non-stroke path skips meaningful move handling for line; select needs live bounds feedback | B1-02 |
| B1-05 | `clipboard` state in store: `{ width, height, cells: { dx, dy, index }[] }` relative to selection origin; `copySelection()` reads palette indices via `getPixelIndex` | frontend | Relative coords enable paste at any anchor; transparent cells (index 0) included | B1-01 |
| B1-06 | Shortcuts: `Ctrl/Cmd+C` copy when selection active; `Ctrl/Cmd+V` enter paste mode; tool key `V` for select; register in `shortcuts.ts` + `ShortcutsOverlay` | frontend | UX.md promises keyboard shortcuts; Riley workflow is keyboard-heavy | B1-05 |
| B1-07 | Paste mode state: `pastePreview: { anchor, clipboard } \| null`; pointer-move repositions anchor; click or Enter confirms | frontend | Explicit confirm per user ask; no modal (UX confirm-sparingly rule) | B1-05 |
| B1-08 | Paste preview rendering via extended preview layer (reuse `previewCells` / `mergeStrokePreviewIntoPixels` pattern or parallel `pastePreview.ts`) | frontend | Floating preview before commit; must not touch undo stack until confirm | B1-07 |
| B1-09 | `PasteCellsCommand` (or `PaintCellsCommand` batch): on confirm, capture `previous` at each destination cell, `next` from clipboard; single command pushed to undo stack | frontend | One undo step per paste matches paint/line behavior; integrates with `dispatchCommands` + sync | B1-07, B1-08 |
| B1-10 | Cancel paste on `Escape`; clear selection on new select or empty click; block in `readOnly` (playback) | frontend | Prevents stuck paste mode; honors `readOnly` flag | B1-07 |
| B1-11 | Register `select` in `registry.ts`, `LeftToolRail`, `content/tools.ts`, icon (`BoxSelect` or similar — avoid `Copy` icon clash with frame duplicate) | frontend | Tool plugin model per ARCHITECTURE.md; accessibility icon + label | B1-02 |
| B1-12 | Unit tests: selection bounds math, clipboard encode/decode, `PasteCellsCommand` apply/revert, shortcut guards when no selection | frontend | Testability for command model; matrix cases for edge bounds | B1-09 |

**Batch 1 acceptance criteria**

- [ ] User drags on canvas with Select tool; on release, dashed marquee shows selected region; single-cell click selects 1×1.
- [ ] `Ctrl/Cmd+C` copies selected pixels to in-memory clipboard; status or subtle feedback when clipboard non-empty.
- [ ] `Ctrl/Cmd+V` shows floating preview at cursor/cell; moving pointer repositions preview; preview does not appear in undo stack.
- [ ] Click or Enter commits paste; `Ctrl/Cmd+Z` reverts entire paste in one step; redo restores it.
- [ ] `Escape` cancels paste preview without mutating pixels.
- [ ] Select/paste disabled during animation playback (`readOnly`).
- [ ] No OpenAPI or server changes; frame sync uses existing `PaintCellsCommand` pending-cell path.

**Batch 1 effort:** **L** (~1.5 person-weeks)

### Batch 2 — P1: Square + ellipse modifiers + polish (Should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | `Shift` during drag → constrain to square (use max of \|dx\|, \|dy\| from anchor) | frontend | User-specified modifier; trivial extension of rect bounds | B1-02 |
| B2-02 | `Shift+C` held during drag → ellipse selection: cells where `(dx/a)² + (dy/b)² ≤ 1` within bounding box (integer cell centers) | frontend | User-specified; algorithm is O(bbox area), fine for ≤128×128 grids | B1-02 |
| B2-03 | Live modifier preview during drag (rect → square → ellipse as keys change) | frontend | Discoverability; avoids surprise on release | B2-01, B2-02 |
| B2-04 | Status bar hint: "Shift: square · Shift+C: circle" when Select active; update shortcuts overlay | frontend | Morgan/Casey personas need guided copy per UX.md | B2-01 |
| B2-05 | Tests: square symmetry, ellipse edge cells, modifier key rollover mid-drag | frontend | Regression guard for selection algorithms | B2-02 |

**Batch 2 acceptance criteria**

- [ ] Holding `Shift` while dragging produces a square selection aligned to drag quadrant.
- [ ] Holding `Shift+C` while dragging produces an ellipse inscribed in the drag bounding box.
- [ ] Releasing keys mid-drag updates preview shape before release.
- [ ] Copy/paste behavior unchanged from Batch 1 for all three shapes.

**Batch 2 effort:** **S** (~0.5 person-weeks)

### Batch 3 — P2: Cut, cross-frame, OS clipboard (Could / defer)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Cut (`Ctrl/Cmd+X`): copy then clear selected cells in one compound undo command | frontend | Standard editor expectation; deferred to avoid scope creep in loop 1 | B1-09 |
| B3-02 | Cross-frame paste (paste into active frame from clipboard captured on any frame) | frontend | Animation workflow; clipboard is frame-agnostic by design in B1-05 | B1-09 |
| B3-03 | Optional PNG export to system clipboard via Clipboard API | frontend | Nice for Casey persona; browser permission friction | B1-05 |
| B3-04 | Paste overlap policy doc + "merge transparent" option | frontend | Open product question; default overwrite in B1 | B1-09 |

**Batch 3 acceptance criteria**

- [ ] Cut is one undo step (restore pixels + clipboard).
- [ ] Paste on frame N after copy on frame M works when user switches frames before paste.

**Batch 3 effort:** **M** (~1 person-week)

**Scope rollup**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 12 | 0 | 12 |
| Batch 2 | 0 | 5 | 0 | 5 |
| Batch 3 | 0 | 4 | 0 | 4 |

## Command & state model recommendation

### Selection state (editorStore)

```typescript
type SelectionState =
  | { status: "idle" }
  | { status: "selecting"; anchor: CellCoord; current: CellCoord; shape: "rect" }
  | { status: "selected"; bounds: Rect; shape: "rect" | "square" | "ellipse"; cells: readonly CellCoord[] };
```

- Selection is **ephemeral UI state** — not undoable. Changing selection does not push commands.
- `cells` computed on pointer-up and cached for copy hit-testing.

### Clipboard format (in-memory, not OS)

```typescript
type PixelClipboard = {
  width: number;   // selection bbox width
  height: number;  // selection bbox height
  cells: { dx: number; dy: number; index: number }[]; // palette indices, incl. TRANSPARENT_INDEX (0)
};
```

- Relative offsets keep paste anchor math simple: destination `(anchor.x + dx, anchor.y + dy)`.
- No backend serialization in v1; clipboard clears on project close/reload.

### Paste preview (ephemeral)

```typescript
type PastePreviewState = {
  anchor: CellCoord;
  clipboard: PixelClipboard;
} | null;
```

- Preview uses the same overlay path as stroke preview (`previewCells` / dedicated `pastePreview.ts`).
- **No command** until confirm.

### Commands

| Operation | Command | Undo behavior |
|-----------|---------|---------------|
| Paste confirm | `PasteCellsCommand` (wrapper around `CellChange[]`) or plain `PaintCellsCommand` | Single stack entry; `revert` restores all `previous` values |
| Cut (Batch 3) | `CompositeCommand` or ordered `[PaintCellsCommand clear, ...]` | One undo step |

**Undo integration:** Paste confirm calls `ctx.dispatch(new PaintCellsCommand(changes))` once. Fits existing `dispatchCommands` → `pushCommands` → `scheduleFrameSync` pipeline. Paste preview cancellation does not touch stacks. If user pastes twice, each confirm is a separate undo step.

### Ellipse algorithm feasibility

Feasible in `canvas/selection.ts` without new dependencies:

1. Compute axis-aligned bbox from anchor + current cell.
2. Semi-axes `a = (maxX - minX) / 2`, `b = (maxY - minY) / 2`; center `(cx, cy)`.
3. For each integer cell `(x, y)` in bbox, include if `((x - cx) / a)² + ((y - cy) / b)² ≤ 1` (guard `a,b > 0`).
4. Clip to grid bounds via `isCellInBounds`.

Complexity O(bbox area); at 64×64 max drag, ~4k checks per move — acceptable with RAF coalescing. Edge case: `a === 0` or `b === 0` degenerates to line/rect — treat as 1-cell-thick rect.

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 600 | 2 | 80% | 1.5 | 640 | 1 |
| Batch 2 | 600 | 0.5 | 70% | 0.5 | 420 | 2 |
| Batch 3 | 150 | 1 | 55% | 1.0 | 82.5 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where Confidence is decimal (80% → 0.8).

**RICE notes**

- Batch 1 ranks first: it unblocks Riley's "duplicate body part across frames" job with rect select alone; highest confidence because `lineTool` + `PaintCellsCommand` patterns exist.
- Sam would promote Batch 2 if a workshop demo is within 2 weeks — ellipse is a visual differentiator for pixel editors, but rect covers torso/limb copy.
- Batch 3 stays last: cut and OS clipboard are convenience, not blockers; cross-frame paste may already work if clipboard is store-global (verify in B1-05 design).

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 78 | 48 | high impact / low–medium risk | Spike paste-preview overlay in `canvas/renderer.ts` early; integration test for confirm→undo→sync |
| Batch 2 | 38 | 52 | low impact / medium risk | Unit-test ellipse at small radii; document Shift+C in shortcuts overlay |
| Batch 3 | 42 | 68 | low impact / high risk | Defer; spike Clipboard API permissions before committing B3-03 |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │  B1    │
 50 │     │ HI/LR  │
 25 │ B2  │   B3   │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Frontend-only** for all batches; dependency direction preserved (`apps/web` → existing API).
- Selection is store state, not a Command.
- Paste commits as **one** `PaintCellsCommand` (or thin wrapper) per confirm.
- Default paste policy: **overwrite** destination cells; transparent clipboard cells paint index 0.
- Batch 1 shippable without Batch 2 (rect only for P0).
- No modal confirm for paste — pointer/Enter confirm only.
- Tool shortcut `V` for Select (industry convention); `Ctrl/Cmd+C/V` for copy/paste.

### Deferred

- Cut (`Ctrl+X`) → Batch 3.
- OS/system clipboard PNG export → Batch 3.
- Selection "marching ants" animation → optional polish after static dashed marquee.
- Multi-selection / additive Shift-click → out of scope.
- Layers-style floating selection that deletes source on move (true "move" tool) → out of scope; paste-only model.

### Open questions (for implementer)

1. **Paste confirm gesture:** click on canvas only, or also Enter/Space when paste mode active? (Recommend: both.)
2. **Paste vs active tool:** Does paste mode temporarily override tool, or work globally when clipboard populated? (Recommend: global `Ctrl+V` enters paste mode; returns to prior tool after confirm/cancel.)
3. **Selection persistence:** Clear selection when switching to paint, or keep until new select? (Recommend: keep until Escape or new select.)
4. **Partial off-grid paste:** Clip cells outside grid on confirm, or block confirm? (Recommend: clip silently.)
5. **Hand tool conflict:** Disable hand pan while paste mode active? (Recommend: yes — paste mode owns pointer.)
6. **Icon naming:** `LeftToolRail` already uses Lucide `Copy` for frame duplicate — Select must use `BoxSelect`/`SquareDashedMousePointer`.
7. **Shift+C discoverability:** Non-standard vs Photoshop (Shift=add, Alt=center); document clearly in status bar.

## Recommended next action

Implement **Batch 1** starting with B1-01/B1-02/B1-04 (store + select tool + drag input), then B1-08/B1-09 (paste preview + command), then B1-06/B1-11 (shortcuts + chrome). Frontend owner; no backend pairing required. Success for the next loop iteration: Riley can rect-select a 16×16 region, copy, reposition preview, confirm paste, and undo/redo once — with tests green and frame sync unchanged. Schedule Batch 2 immediately after Batch 1 merges if workshop timeline allows.
