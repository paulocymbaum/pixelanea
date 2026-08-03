# Loop Backlog — Select Tool + Copy/Paste

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | editor |
| **Trigger** | Product refinement session for Select tool + Copy/Paste per user requirements and current tool/command architecture |
| **Horizon** | Next implementation batch (P0), follow-on polish batch (P1) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Pixelanea's editor has six registered tools (`paint`, `eraser`, `eyedropper`, `fill`, `line`, `hand`) and a `PaintCellsCommand`-based undo stack (500 cap), but no selection marquee, internal clipboard, or pixel copy/paste. The user specified: drag-select finalized on pointer-up; Shift constrains to square; Shift+C constrains to circle; copy/paste with move-then-confirm placement; full undo/redo. All work is frontend-only — no OpenAPI or migration changes. Primary persona Riley (hobby game dev) needs fast sprite duplication within a frame; Morgan needs obvious recovery via undo.

## Dialogue summary

- **Jordan:** Confirmed the feature fits the existing `Tool` + `Command` plugin model and stays inside `apps/web`; biggest risks are `useToolInput` (today only paint/eraser get continuous pointer-move during drag) and a paste-preview state machine that must preempt normal tool routing.
- **Sam:** Insisted P0 must ship rect + square + circle select together with copy/paste — partial select without paste is not shippable for Riley's "duplicate a limb and nudge" workflow.
- **Jordan:** Advocated store-backed `selection` + `clipboard` + `pasteSession` slices (not tool-local only) so Ctrl+C/V work after switching tools and canvas overlay can subscribe; reuse `PaintCellsCommand` for paste apply, optionally wrapped as `PasteCellsCommand` for semantics and tests.
- **Sam:** Accepted deferring Cut, Delete, and system clipboard to P1; demanded status-bar hint during paste mode ("Click to place · Esc to cancel").
- **Jordan:** Circle = cells whose centers fall inside the ellipse inscribed in the drag bounding box (same anchor as square constraint); unit-test the iterator, not pixel-perfect antialiasing.
- **Convergence:** Batch 1 = full select modes + internal clipboard + move-confirm paste + undo; Batch 2 = cut/delete/polish; Batch 3 = cross-frame + OS clipboard. Implement via **skill-implementer** for Batch 1; escalate to **AGENT-recursive-implementer** only if Batch 1+2 are merged into one quality-gated loop.

## Batched tasks

### Batch 1 — Must ship (P0)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Extend `useToolInput` to route `onPointerMove` with button held for `select` tool (live marquee preview during drag) | frontend | `lineTool` only uses down/up; select requires drag preview — evidence in `useToolInput.ts` STROKE_TOOLS branch | — |
| B1-02 | Add `selectTool` with pointer-down anchor, pointer-move preview, pointer-up commit; Shift → square bbox; Shift+C → circle/ellipse bbox | frontend | Core user requirement; finalize selection on release, not on down | B1-01 |
| B1-03 | Add `canvas/selectionRegion.ts` — `cellsInRect`, `cellsInSquare`, `cellsInEllipse` (center + rx/ry from bbox); clip to grid bounds | frontend | Pure coordinate math belongs in `canvas/` per frontend rules | — |
| B1-04 | Add editor store slices: `selection`, `selectedCells`, `clipboard`, `pasteSession` with actions `setSelection`, `clearSelection`, `copySelection`, `beginPaste`, `updatePasteAnchor`, `commitPaste`, `cancelPaste` | frontend | Selection must survive tool switch for Ctrl+C/V; paste preview needs global render + shortcut hooks | B1-02, B1-03 |
| B1-05 | Render selection overlay (marching-ants or dashed rect) and paste-preview ghost cells in canvas renderer / `useCanvasRenderState` | frontend | User must see marquee and floating paste before commit | B1-04 |
| B1-06 | Implement `copySelection()` — snapshot palette indices for selected cells into internal clipboard (frame-local, active frame only) | frontend | No backend; clipboard is in-memory payload + width/height | B1-04 |
| B1-07 | Implement paste state machine: Ctrl+V → `beginPaste`; pointer-move updates anchor; pointer-down or Enter commits; Escape cancels; readOnly blocks all | frontend | Move-then-confirm UX per user spec | B1-04, B1-05, B1-06 |
| B1-08 | Add `PasteCellsCommand` (thin wrapper over `CellChange[]` with same apply/revert as `PaintCellsCommand`); register in `dispatchCommands` pending-cell path | frontend | Keeps undo semantics consistent; name clarifies intent in stack | B1-07 |
| B1-09 | Wire shortcuts: tool key `S` → select; Ctrl+C copy; Ctrl+V paste; guard `isEditableTarget`; respect `readOnly` | frontend | UX.md promises tool keys + Ctrl+Z; Riley persona | B1-06, B1-07 |
| B1-10 | Register `select` in `tools/registry.ts`, `content/tools.ts`, `LeftToolRail` (resolve icon clash — frame duplicate currently uses `Copy` icon from lucide) | frontend | Toolbar requires icon + label per UX.md Morgan requirements | B1-02 |
| B1-11 | Add `content/copy.ts` strings + ShortcutsOverlay entries for Select, Copy, Paste | frontend | All user-facing strings in `content/` | B1-09, B1-10 |
| B1-12 | Unit tests: `selectionRegion` geometry, `PasteCellsCommand` undo/redo, select tool pointer sequence, paste cancel/commit | frontend | test-matrix-unit coverage for algorithms and command stack | B1-03, B1-07, B1-08 |

### Batch 2 — Should ship (P1)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Cut (Ctrl+X) — copy then clear selected cells in one `PaintCellsCommand` | frontend | Expected edit affordance once copy exists | B1-08 |
| B2-02 | Delete / Backspace clears selected cells (transparent index 0) | frontend | Fast cleanup without switching to eraser | B1-04 |
| B2-03 | Click outside selection clears marquee (when not in paste session) | frontend | Standard marquee UX; reduces trapped selection | B1-04 |
| B2-04 | Status bar paste hint via `StatusBar.tsx` when `pasteSession` active | frontend | Morgan persona — obvious cancel path | B1-07 |
| B2-05 | Select-all Ctrl+A | frontend | Power-user baseline | B1-03, B1-04 |
| B2-06 | Extend `shortcuts.ts` tests + `LeftToolRail.test.tsx` for select tool presence | frontend | Prevent shortcut regression | B1-10 |

### Batch 3 — Could ship (P2)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | System clipboard export/import as PNG (optional `navigator.clipboard` + graceful offline fallback) | frontend | Nice for Casey Figma workflow; not local-first critical | B1-06 |
| B3-02 | Cross-frame copy/paste (clipboard tagged with source frame) | frontend | Animation workflow; higher edge-case surface | B1-06 |
| B3-03 | Paste merge mode (overwrite vs skip transparent) | frontend | Alex modder fidelity; defer until basic paste stable | B1-08 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 12 | 0 | 12 |
| Batch 2 | 0 | 6 | 0 | 6 |
| Batch 3 | 0 | 3 | 0 | 3 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 | 2 | 0.75 | 1.5 | 800 | 1 |
| Batch 2 | 600 | 1 | 0.85 | 0.5 | 1020 | 2 |
| Batch 3 | 200 | 0.5 | 0.55 | 1.0 | 55 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort`

**RICE notes:**

- Batch 1 ranks first on strategic grounds despite Batch 2's higher raw RICE — without Batch 1, B2 tasks have nothing to extend.
- Sam would not promote Batch 3 before workshop pilot; OS clipboard adds permission friction Morgan cannot support in lab installs.
- Confidence on Batch 1 is 75% due to paste state machine + input-routing coupling; spike B1-01/B1-07 in first implementer step.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 78 | 62 | high impact / medium risk | Spike `useToolInput` drag routing and paste FSM first; unit-test `selectionRegion` before UI polish; keep paste commit as single `PasteCellsCommand` |
| Batch 2 | 45 | 28 | low impact / low risk | Ship only after B1 tests green; Cut = compose existing copy + clear command |
| Batch 3 | 30 | 72 | low impact / high risk | Defer; document offline fallback; no pilot dependency |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │  B1    │
 50 │ B2  │        │
 25 │     │  B3    │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Technical feasibility reference

### Commands

| Approach | Recommendation |
|----------|----------------|
| `PasteCellsCommand` | **Yes** — implement as dedicated class mirroring `PaintCellsCommand` apply/revert; may delegate to shared `applyCellChanges()` helper to avoid duplication |
| `MoveSelectionCommand` | **Defer** — P0 paste is copy-only (non-destructive source); Cut in B2 composes copy + clear |
| Undo interaction | Paste commit pushes one command; cancel paste pushes nothing; undo during paste session should cancel preview first (Escape), not revert pixels |

### State placement

| State | Location | Why |
|-------|----------|-----|
| `selection`, `clipboard`, `pasteSession` | `editorStore` (new slice or `editorStoreSelection.ts`) | Shortcuts, StatusBar, and canvas renderer subscribe outside active tool |
| Drag anchor / in-progress bbox | `selectTool` module refs (like `lineStart` in `lineTool.ts`) | Ephemeral until pointer-up commits to store |
| Paste preview pixel overlay | `pastePreview.ts` module or store-driven `pasteSession.anchor` | Mirror `strokePreview.ts` pattern — preview without mutating `pixels` until commit |

### Circle selection algorithm

1. On pointer-up, compute axis-aligned bbox from anchor → current cell (same as rect).
2. If Shift+C: treat bbox as bounding square of ellipse — center = bbox center, `rx = width/2`, `ry = height/2` (square when Shift also held: `rx = ry = min(w,h)/2`).
3. Iterate integer cells `(x,y)` in bbox; include cell if `(x+0.5-cx)²/rx² + (y+0.5-cy)²/ry² ≤ 1` (center-sample; consistent with pixel grid).
4. Clip to `[0, gridWidth)` × `[0, gridHeight)`.
5. Unit-test: unit circle at origin, 3×3 bbox, and shift-square coupling.

### Paste preview state machine

```text
                    Ctrl+V (clipboard non-null)
         ┌──────────────────────────────────────┐
         ▼                                      │
      [idle] ──select/copy──► [hasSelection]   │
         ▲                            │         │
         │                     Ctrl+C  │         │
         │                            ▼         │
         │                      [clipboard] ────┘
         │                            │
         │                     beginPaste
         │                            ▼
         │                    [pastePreview]
         │                     │    │    │
    cancelPaste            move   │  commitPaste
    (Esc)                  anchor │  (click/Enter)
         │                     │  │    │
         └─────────────────────┴──┴────┘
                              dispatch PasteCellsCommand
```

- **readOnly:** all transitions to `pastePreview` or mutation blocked.
- **Tool switch during paste:** cancel paste (Sam: avoid orphaned ghost).
- **Undo stack:** unchanged until `commitPaste`.

### Test strategy hints

| Layer | Cases |
|-------|-------|
| `selectionRegion.ts` | Empty bbox, 1×1, square shift, circle vs rect cell counts, grid edge clip |
| `PasteCellsCommand` | Apply/revert symmetry, overlap with transparent cells, undo/redo via `editorStoreCommands` |
| `selectTool` | Pointer down→move→up produces store selection; shift modifiers |
| `shortcuts.ts` | Ctrl+C/V/Esc; no-op when `readOnly` |
| Integration | Copy → switch to paint → Ctrl+V → move → commit → Ctrl+Z restores prior pixels |
| E2E (B2) | Gherkin: select region, paste, undo — add to changelog when B1 lands |

## Decisions & open questions

### Agreed

- Frontend-only; no `contracts/openapi.yaml` changes.
- P0 includes rect, square (Shift), and circle (Shift+C) — not split across batches.
- Store-backed selection and clipboard; tool holds only transient drag state.
- Paste = non-destructive copy placement with move-then-confirm; single undo step on commit.
- Reuse `PaintCellsCommand` mechanics; add `PasteCellsCommand` for clarity and dispatch typing.
- Batch 1 shippable without Batch 2.

### Deferred

- Cut, Delete, Select-all → Batch 2.
- System clipboard, cross-frame paste, merge modes → Batch 3.
- `MoveSelectionCommand` (destructive move in one step) — use Cut+Paste workaround until demanded.

### Open questions

- **Icon clash:** `LeftToolRail` uses lucide `Copy` for frame duplicate — select tool needs `SquareDashed` or `BoxSelect`; rename frame button aria-label only, or reorder rail?
- **Shift+C chord:** While Shift held during drag, does `C` keydown toggle circle mode, or is it `Shift`+`C` as hold-both during drag? **Proposed:** treat as modifier flag set when `C` is down while Shift held at pointer-up (document in shortcuts).
- **Paste click vs paint tool:** First click commits paste — must consume event so paint does not fire (input router priority).

## Recommended next action

**Implement Batch 1 with skill-implementer** (`pixelanea-frontend-standards`), starting with a thin spike on B1-01 + B1-03 + B1-07 (input routing, geometry, paste FSM) before toolbar polish. Success for the next loop iteration: user can drag-select (rect/square/circle), Ctrl+C, Ctrl+V, move ghost, click to commit, Ctrl+Z undoes paste — all with `readOnly` respected and unit tests green for region + command. Use **AGENT-recursive-implementer** only if the parent orchestrator wants B1+B2 delivered under a single quality gate (EVALUATION ≥ 95); otherwise recursive overhead is unnecessary for a well-bounded frontend batch.
