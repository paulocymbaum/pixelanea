# Loop Backlog — Canvas Viewport Performance

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-05 |
| **Feature area** | editor |
| **Trigger** | Product request: performance audit on zoom/pan and canvas interactions for Riley (primary persona) |
| **Horizon** | Next shippable batch (1–2 weeks frontend-only) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Code review of the canvas viewport stack (`Canvas.tsx`, `useCanvasRenderState.ts`, `renderer.ts`, `viewportStore.ts`, `coordinates.ts`, `useSelectionOutlineOverlay.ts`, `ZoomControls.tsx`) confirms that wheel zoom and hand-pan call `setViewport` on every input event with no RAF coalescing. Viewport changes alter the `redraw` callback identity in `useStrokePreviewRedraw`, which triggers one or two full `renderGrid()` passes per tick. Each full render is O(gridWidth × gridHeight) with no visible-cell culling. Stroke and placement previews already use `repaintGridCells`; selection marching ants use a separate overlay canvas. All optimizations stay in `apps/web/src/canvas/` and `viewportStore.ts` — no domain, OpenAPI, or backend changes.

## Dialogue summary

- **Jordan** verified all nine preliminary observations; corrected #8 (HiDPI resize is cached via `WeakMap`, but `setTransform` still runs every redraw). Identified a **double-redraw** bug: two `useEffect` hooks in `useStrokePreviewRedraw` both depend on `redraw` and call it when viewport changes while idle.
- **Sam** anchored priority on Riley's zoom/pan feel during detail work (8×+ zoom, `GRID_LINE_MIN_ZOOM = 8`) and large imported grids — not stroke painting, which is already partially optimized.
- **Batch 1** = RAF-coalesced viewport redraw + dedupe effects + visible-cell culling + decouple viewport from Canvas React tree. Shippable without CSS-transform complexity.
- **Batch 2** = CSS transform pan preview, checkerboard/pattern optimization, wheel handler RAF at source. Sam accepts deferring offscreen cache to Batch 3 despite higher theoretical upside.
- **RICE** ranks Batch 1 first (best effort/impact ratio); Batch 3 offscreen cache is strategic but high risk; Sam would not promote it ahead of Batch 1 for this loop.

## Ranked bottlenecks (user impact)

| Rank | Bottleneck | User impact | Code evidence |
|------|------------|-------------|---------------|
| 1 | Full `renderGrid()` on every viewport tick | Janky zoom/pan; primary navigation friction for Riley | `redraw` depends on `zoom`/`panX`/`panY` (`useCanvasRenderState.ts:377–379`); `renderGrid` clears canvas and redraws entire grid (`renderer.ts:517–543`) |
| 2 | No RAF coalescing for wheel/pan | Multiple full renders per frame during fast scroll/drag | `Canvas.tsx:174` `setViewport` per wheel event; `Canvas.tsx:209–213` per `pointermove` during pan — unlike strokes which use `scheduleRedraw` (`useCanvasRenderState.ts:399–407`) |
| 3 | O(w×h) `drawPixels` with no viewport culling | Worse on large imports; wasted work when zoomed in | `drawPixels` iterates all cells (`renderer.ts:284–298`); no `visibleCell*` helpers in codebase |
| 4 | Double redraw on viewport change (idle) | ~2× cost per pan/zoom step | Two effects both list `redraw` as dep and call `redraw()` (`useCanvasRenderState.ts:417–425`, `427–436`) |
| 5 | Per-cell checkerboard at high zoom | Cost spikes at 8×+ where grid lines also appear | `drawCheckerCell` nested 8px loops per cell (`renderer.ts:172–185`); full render uses area `drawCheckerboard` (`renderer.ts:522–528`) |
| 6 | React re-renders on viewport | Main-thread contention alongside canvas work | `useCanvasRenderState` subscribes to viewport (`:84–86`); `Canvas` reads `zoom`/`panX`/`panY` (`Canvas.tsx:49–51`); `canvasIsBlank` scans pixels every render (`Canvas.tsx:367–373`) |
| 7 | Selection overlay redraw on pan/zoom | Minor vs grid; already isolated on overlay canvas | `useSelectionOutlineOverlay.ts:128–133` effect on `zoom`/`panX`/`panY`; marching ants RAF is cheap (`:106–111`) |
| 8 | HiDPI setup per redraw | Low — resize is guarded | `setupHiDpiCanvas` only mutates `canvas.width` when size/dpr changes (`renderer.ts:105–118`); `setTransform` still runs each call (`:128`) |
| 9 | Grid lines at zoom ≥ 8 | Moderate at default 32×32; scales with grid size | `GRID_LINE_MIN_ZOOM = 8` (`coordinates.ts:3`); `drawGridLines` draws w+h+2 line segments (`renderer.ts:324–336`) |

## Feasibility assessment

| Optimization | Feasibility | Where changes go | Effort | Risk | Notes |
|--------------|-------------|------------------|--------|------|-------|
| **RAF coalescing (viewport)** | High | `useCanvasRenderState.ts` — subscribe to `viewportStore` via `useEffect` + existing `scheduleRedraw`; optionally thin `Canvas.tsx` wheel/pan to call `scheduleViewportUpdate` | 0.5 pw | Low | Reuse stroke RAF pattern; no API changes |
| **Dedupe double redraw** | High | `useCanvasRenderState.ts` — merge viewport + selection/stroke effects into single coalesced scheduler | 0.25 pw | Low | Immediate win independent of culling |
| **Visible-cell culling** | High | `coordinates.ts` — `visibleCellBounds(viewport, cssSize, gridSize)`; `renderer.ts` — bound loops in `drawPixels`, `drawCheckerboard`, `drawGridLines`, `drawFilterPreview` | 0.75 pw | Low–med | Must handle partial cells at edges; unit tests in `coordinates.test.ts` + `renderer.test.ts` |
| **Decouple viewport from React** | Med–high | `Canvas.tsx` — read viewport from store ref for handlers; memoize `canvasIsBlank`; `ZoomControls.tsx` already isolated | 0.5 pw | Low | `screenToCell` in pan handler can use `getState()` |
| **CSS transform during pan** | Medium | `Canvas.tsx` — wrapper `transform: translate()` during `panDragRef`; commit `setViewport` on pointer up; `coordinates.ts` — optional `panOffset` for hit-testing during drag | 1 pw | Med | Hover/tool coords must account for transform or be suppressed while panning |
| **Checkerboard pattern / tile** | Medium | `renderer.ts` — `createPattern` from 16×16 tile or scale-aware `drawCheckerboard` without per-cell loops in `repaintGridCells` | 0.5 pw | Low | Visual parity check at all zoom levels |
| **Offscreen bitmap cache** | Medium | New `canvas/gridBitmapCache.ts` + hook in `useCanvasRenderState.ts`; invalidate on pixels/palette/zoom-tier/onion/filter changes | 2 pw | High | Memory pressure on HiDPI; invalidation bugs show stale art |
| **Dirty regions (viewport)** | Low value | N/A for pan/zoom — entire scene moves | — | — | Already valuable for strokes via `repaintGridCells`; not a pan/zoom win |

**Layer boundary:** All tasks are `frontend` or `both` only in the sense of coordinated canvas modules — no `server/`, `domain/`, or `contracts/openapi.yaml` changes.

## Batched tasks

### Batch 1 — Viewport redraw coalescing & culling (must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | RAF-coalesce viewport-driven canvas redraw (subscribe to `viewportStore` changes, call `scheduleRedraw` instead of synchronous `redraw` on identity change) | frontend | Caps work to 1 render/frame during wheel/pan; mirrors stroke path | — |
| B1-02 | Merge/dedupe `useEffect` redraw triggers so viewport `redraw` identity change does not fire twice when idle | frontend | Removes ~50% redundant full renders on pan/zoom | — |
| B1-03 | Add `visibleCellBounds()` in `coordinates.ts` and use it in `drawPixels`, `drawCheckerboard`, `drawGridLines`, `drawFilterPreview` | frontend | Largest CPU cut when zoomed in on large grids | — |
| B1-04 | Decouple viewport from `Canvas` React render path: `getState()` in wheel/pan handlers; memoize `canvasIsBlank` check | frontend | Reduces React work competing with canvas on main thread | B1-01 |
| B1-05 | Add viewport perf regression tests: mock `renderGrid` call count per coalesced wheel burst; culling bounds unit tests | frontend | Prevents reintroduction of per-event full renders | B1-01, B1-03 |

### Batch 2 — Interaction polish (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | CSS `transform` pan preview on main + overlay canvas; commit viewport on pointer up | frontend | Pan feels instant; full `renderGrid` only once per gesture | B1-01 |
| B2-02 | RAF-coalesce wheel `setViewport` at source in `Canvas.tsx` (accumulate delta, apply once per frame) | frontend | Fewer Zustand updates and overlay reposition churn | B1-01 |
| B2-03 | Optimize checkerboard: `createPattern` tile or simplified area fill; simplify `drawCheckerCell` for `repaintGridCells` | frontend | High-zoom checker cost rank #5 | B1-03 |
| B2-04 | Pause marching-ants RAF during active pan/zoom; single overlay draw on gesture end | frontend | Avoid overlay + grid fighting for main thread | B2-01 |

### Batch 3 — Deep cache (could ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Offscreen grid bitmap cache keyed by zoom tier + pixel revision; blit with pan offset during navigation | frontend | Theoretical largest win for repeated pan at fixed zoom | B1-03, B2-01 |
| B3-02 | `ImageBitmap` / `OffscreenCanvas` spike with invalidation matrix documented | frontend | De-risk B3-01 before full implementation | — |
| B3-03 | Dev-only perf overlay (FPS, renderGrid ms, cells drawn) behind feature flag | frontend | Validates Riley-facing improvements in workshop | B1-05 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 5 | 0 | 5 |
| Batch 2 | 0 | 4 | 0 | 4 |
| Batch 3 | 0 | 3 | 0 | 3 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 Riley sessions | 2 (high — core navigation) | 85% | 2.0 | **680** | 1 |
| Batch 2 | 600 Riley sessions | 1.5 (polish — pan "butter") | 70% | 2.5 | **252** | 2 |
| Batch 3 | 400 Riley sessions | 2 (large-grid power users) | 50% | 3.0 | **133** | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where `Confidence` is expressed as a decimal (e.g. 85% → 0.85).

**RICE notes:**

- Batch 1 wins on confidence and effort — Jordan has concrete insertion points and no architectural boundary violations.
- Sam would not promote Batch 3 despite high theoretical impact until Batch 1 metrics prove pan/zoom is still insufficient on 128×128+ imports.
- Batch 2 CSS-transform pan is the highest **feel** upgrade but depends on Batch 1 coalescing to avoid compounding coordinate bugs.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 72 | 22 | high impact / low risk | Unit tests for bounds + render call counts; manual Riley zoom/pan pass at 8× and 16× |
| Batch 2 | 58 | 48 | high impact / low risk | Feature-flag CSS pan; suppress hover during transform; pointer-up commit tests |
| Batch 3 | 65 | 78 | high impact / high risk | Spike first (B3-02); strict invalidation on `committedPixels` revision; memory cap on cache entries |

```text
Impact ↑
100 │     │ HI/HRI  │  ← Batch 3
 75 │     │ HI/LR   │  ← Batch 1
 50 │     │         │  ← Batch 2
 25 │ LI/LR │         │
  0 └─────┴─────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- Scope is **frontend canvas only** — no domain, DB, or OpenAPI changes.
- Batch 1 ships independently and defines success for this loop.
- Existing stroke `repaintGridCells` and selection overlay architecture are kept; optimizations extend — not replace — them.
- `GRID_LINE_MIN_ZOOM = 8` stays; culling naturally reduces grid-line work when zoomed in.

### Deferred

- Offscreen bitmap cache (Batch 3) until Batch 1+2 measured on 64×64 and 128×128 grids.
- WebGL renderer or second canvas layer — out of scope; single-canvas architecture preserved per `pixelanea-frontend.mdc`.
- Backend pixel buffer push — violates dependency direction and unnecessary for viewport perf.

### Open questions

- What is the **p95 grid size** among Riley projects after import? Drives Batch 3 priority.
- Should wheel zoom use continuous scaling vs discrete `ZOOM_STEP` during gesture (UX.md silent)? Affects B2-02 design.
- Is `canvasIsBlank` scan acceptable if memoized only on pixel revision, or should it move to editor store derived state?

## Recommended next action

Implement **Batch 1** starting with **B1-01 + B1-02** in `useCanvasRenderState.ts`: add a `useEffect` that subscribes to `useViewportStore` and calls `scheduleRedraw` on zoom/pan changes, and consolidate the duplicate `redraw()` effects so viewport updates produce exactly one coalesced frame. Follow with **B1-03** (`visibleCellBounds` in `coordinates.ts`, wired into `renderer.ts`). Frontend owns the batch; success is Riley can wheel-zoom and hand-pan at 16× on a 64×64 canvas without visible stutter, with `renderGrid` invoked ≤1× per animation frame during continuous input (verified by B1-05 tests).
