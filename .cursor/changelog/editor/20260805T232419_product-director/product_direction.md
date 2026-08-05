# Product Direction — Canvas Viewport Performance Audit

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-05 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (Hobby Game Dev — pixel artist) |
| **Teams convened** | Design (Maya, Leo) + Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/editor/20260805T231905_uxui-design-critique/uxui_design_critique.md`, `.cursor/changelog/editor/20260805T231910_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea promises Riley that the canvas is the hero — paint, zoom, and pan should all feel immediate and trustworthy. Today, stroke preview is optimized (RAF-coalesced partial repaints) but navigation still triggers full-grid repaints on every wheel tick and pan pixel, breaking the UX contract of "instant feedback." This loop closes that gap: make zoom and pan as smooth as painting on typical Riley grids (32×32–64×64) at detail zoom (8×–16×), without changing architecture (single canvas, local-first, no backend). Success is measured by perceived smoothness during the golden path — zoom to cursor, hand-pan, paint, zoom out — not by optimization count.

## Chair brief

**Product question:** Why does canvas navigation feel worse than painting, and what should we ship first to make zoom/pan match Riley's creative flow?

**Primary persona:** Riley — blocks sprites at 32×48, zooms to 8×+ for pixel edges, pans between limbs, paints with live stroke preview.

**Success looks like:** Riley can wheel-zoom and hand-pan at 16× on a 64×64 canvas without visible stutter; zoom-to-cursor stays stable across input methods; paint-after-pan has no coordinate drift.

**Constraints:** Local-first, canvas hero, single `<canvas>` architecture, layer boundaries (`apps/web/src/canvas/` only — no domain/OpenAPI/backend), existing stroke `repaintGridCells` and selection overlay preserved.

**Teams convened:** Design + Strategy (parallel product review).

## Performance findings (bottlenecks ranked by impact)

| Rank | Bottleneck | User impact | Evidence |
|------|------------|-------------|----------|
| 1 | **Full `renderGrid()` on every viewport delta** | Primary jank during zoom/pan — canvas "fights" Riley | `redraw` depends on `zoom`/`panX`/`panY` (`useCanvasRenderState.ts:377–379`); `renderGrid` clears and redraws entire grid (`renderer.ts:517–543`) |
| 2 | **No RAF coalescing for wheel/pan** | Multiple full renders per frame during fast scroll/drag | `Canvas.tsx:174` per wheel event; `Canvas.tsx:209–213` per `pointermove` — unlike strokes (`useCanvasRenderState.ts:399–407`) |
| 3 | **Double redraw on viewport change (idle)** | ~2× cost per pan/zoom step | Two `useEffect` hooks both depend on `redraw` and call it (`useCanvasRenderState.ts:417–425`, `427–436`) |
| 4 | **O(w×h) `drawPixels` with no visible-cell culling** | Worse on large imports; wasted work when zoomed in | `drawPixels` iterates all cells (`renderer.ts:284–298`); no `visibleCellBounds` in codebase |
| 5 | **Per-cell checkerboard + grid-line cliff at 8×** | Cost spikes exactly when Riley zooms in to edit | `drawCheckerCell` 8px nested loops (`renderer.ts:172–185`); `GRID_LINE_MIN_ZOOM = 8` triggers full `drawGridLines` (`renderer.ts:311–336`) |
| 6 | **React re-renders on viewport** | Main-thread contention alongside canvas | `useCanvasRenderState` subscribes to viewport (`:84–86`); `canvasIsBlank` scans pixels every render (`Canvas.tsx:348–353`) |
| 7 | **Dual-canvas work with selection** | Compounds jank when marching ants are visual anchor | Overlay redraws on pan/zoom (`useSelectionOutlineOverlay.ts:128–133`) plus main grid full repaint |
| 8 | **HiDPI setup per redraw** | Low — resize guarded via `WeakMap` | `setupHiDpiCanvas` (`renderer.ts:105–118`); `setTransform` still runs each call |

## UX / perceived performance issues

- **Asymmetric smoothness:** Paint feels butter; navigation stutters — violates UX.md "instant feedback" for half the core loop.
- **Zoom anchor inconsistency:** Wheel zooms to cursor; buttons and `+`/`-` shortcuts zoom to viewport center (`ZoomControls.tsx`, `shortcuts.ts`) — spatial discontinuity when switching input methods.
- **Stepped wheel zoom:** Fixed `ZOOM_STEP` (1.25) per event feels mechanical on trackpads.
- **Grid-line cliff at 8×:** Crossing into pixel-edit range suddenly adds full-grid line strokes — worst moment for perf.
- **Zoom hidden from StatusBar:** Percent only in corner overlay; DESIGN.md spec includes status zoom — Riley lacks stable magnification reference during jank.
- **Hand-tool-only pan:** No spacebar temporary pan — tool switch friction while painting (deferred P2).

## Recommended optimizations

| Optimization | Feasibility | Where | Batch | Feel / impact |
|--------------|-------------|-------|-------|---------------|
| RAF-coalesce viewport redraw | High | `useCanvasRenderState.ts` — `scheduleRedraw` on viewport store changes | 1 | ≤1 repaint/frame; mirrors stroke path |
| Dedupe double-redraw effects | High | `useCanvasRenderState.ts` — merge conflicting `useEffect` triggers | 1 | Immediate ~50% cut on idle pan/zoom |
| Visible-cell culling | High | `coordinates.ts` + `renderer.ts` — `visibleCellBounds()` | 1 | Largest CPU cut when zoomed in on large grids |
| Decouple viewport from React tree | Med–high | `Canvas.tsx` — `getState()` in handlers; memoize `canvasIsBlank` | 1 | Less main-thread React work during gestures |
| CSS transform during pan | Medium | `Canvas.tsx` — wrapper translate during drag; commit on pointer-up | 2 | Finger-locked 60fps motion; one `renderGrid` per gesture |
| RAF wheel at source | Medium | `Canvas.tsx` — accumulate delta per frame | 2 | Fewer Zustand + overlay updates |
| Checkerboard pattern tile | Medium | `renderer.ts` — `createPattern` vs per-cell loops | 2 | Less checker "swimming" at high zoom |
| Defer/fade grid lines during gesture | High | `renderer.ts` + gesture flag | 2 | Smoother crossing into ≥8× (fade to 30%, not hide) |
| Unified zoom anchor | High | `ZoomControls.tsx`, `shortcuts.ts`, `Canvas.tsx` | 2 | No lurch scroll → `+`/`-` |
| StatusBar zoom | High | `StatusBar.tsx` | 2 | Stable magnification reference |
| Offscreen bitmap cache | Medium (high risk) | New `gridBitmapCache.ts` | 3 | Theoretical largest sustained pan win — defer until Batch 1+2 measured |
| Dirty regions for viewport | Low value | N/A | — | Scene moves entirely; strokes already use `repaintGridCells` |

## Synthesis

### Aligned

- **Root cause is architectural asymmetry:** strokes use RAF + partial repaint; viewport uses synchronous full `renderGrid()` — often twice per tick.
- **Batch 1 is the release gate:** RAF coalescing, dedupe effects, visible-cell culling, React decoupling — ~2 person-weeks, frontend-only, high confidence (RICE 680).
- **No layer violations:** all work stays in `apps/web/src/canvas/` and `viewportStore.ts`.
- **Preserve wins:** `repaintGridCells` for strokes, marching ants on overlay, single-canvas architecture, `GRID_LINE_MIN_ZOOM = 8` threshold.
- **Success metric:** `renderGrid` invoked ≤1× per animation frame during continuous zoom/pan at 16× on 64×64; Riley golden path feels as smooth as painting.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| CSS transform pan vs Batch 1 only | Strategy wants Batch 1 first; Design wants instant finger-tracking | **Batch 1 ships first; CSS transform pan in Batch 2** | Highest feel upgrade but coordinate/hit-test risk; Batch 1 coalescing is prerequisite |
| Hide vs fade grid lines during gesture | Leo: hide; Maya: Riley uses lines as alignment guides | **Fade grid lines to ~30% during gesture; full opacity on settle** | Preserves alignment cues without full grid-line cost |
| Spacebar temporary pan | Maya: industry standard; Leo: cursor/shortcut conflicts | **Defer to P2** — no ship this loop; validate with Riley persona testing | Real flow win but mode complexity and color-key conflicts |
| Offscreen bitmap cache | Jordan: high theoretical upside; Sam: high invalidation risk | **Defer to Batch 3** — spike only after Batch 1+2 measured on 64×64 and 128×128 | Memory + stale-art risk outweighs uncertain gain before cheaper wins land |
| Unified zoom anchor | Design P1; not in Jordan's Batch 1 | **Ship in Batch 2 with UX polish** — low effort, high continuity payoff | Doesn't fix perf but fixes disorientation; pairs with gesture polish |
| Continuous vs stepped wheel zoom | Open question in strategy backlog | **Keep `ZOOM_STEP` for buttons; evaluate accumulated wheel delta in Batch 2** | Don't change zoom semantics in Batch 1 perf pass |

**Taylor (Product Director):** Riley's trust lives in the canvas feeling "glued" to their intent. We already proved we can optimize the paint path — navigation is now the credibility gap. Batch 1 is non-negotiable this loop: coalesce, dedupe, cull. Batch 2 is where the product starts to feel premium (CSS pan, anchor consistency, StatusBar zoom). Batch 3 is a power-user bet we only take if imports at 128×128+ still hurt after measurement.

### Decisions

**We will**

- Ship **Batch 1** as the performance release gate (B1-01 through B1-05).
- Extend — not replace — existing stroke partial repaint and selection overlay patterns.
- Add regression tests for render call counts and visible-cell bounds.
- Fade grid lines during active viewport gestures (Batch 2).
- Unify zoom anchor across wheel, buttons, and shortcuts (Batch 2).
- Surface zoom percent in StatusBar per DESIGN.md (Batch 2).

**We will not (this loop)**

- Implement offscreen bitmap cache (Batch 3) before measuring Batch 1+2 on large grids.
- Add WebGL or per-pixel DOM.
- Change domain, OpenAPI, or backend layers.
- Ship spacebar temporary pan without persona validation.
- Remove grid lines entirely during gesture.

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | RAF-coalesce viewport-driven canvas redraw (≤1 `renderGrid`/frame) | eng | strategy B1-01 |
| P0 | Dedupe double-redraw `useEffect` bug on viewport change | eng | strategy B1-02 |
| P0 | `visibleCellBounds()` + culling in `drawPixels`, checkerboard, grid lines, filter preview | eng | strategy B1-03 |
| P0 | Decouple viewport from `Canvas` React render path; memoize `canvasIsBlank` | eng | strategy B1-04 |
| P0 | Viewport perf regression tests (render call count, bounds unit tests) | eng | strategy B1-05 |
| P1 | CSS transform pan preview with pointer-up commit | eng | design + strategy B2-01 |
| P1 | RAF-coalesce wheel `setViewport` at source | eng | strategy B2-02 |
| P1 | Checkerboard pattern optimization | eng | strategy B2-03 |
| P1 | Pause marching ants during active pan/zoom | eng | strategy B2-04 |
| P1 | Unified zoom anchor (cursor / last hover cell) | ux/eng | design #4 |
| P1 | Fade grid lines during gesture (~30% opacity) | ui/eng | design #5 |
| P1 | Zoom percent in StatusBar | ui | design #6 |
| P2 | Spacebar temporary pan | ux/eng | design (deferred) |
| P2 | Offscreen grid bitmap cache | eng | strategy Batch 3 |
| P2 | Dev-only perf overlay (FPS, renderGrid ms) | eng | strategy B3-03 |

## Shippable batch plan

### Batch 1 — Viewport redraw coalescing & culling (must ship this loop, ~2 pw)

1. B1-01 + B1-02: `useCanvasRenderState.ts` — viewport subscription → `scheduleRedraw`; merge duplicate effects.
2. B1-03: `coordinates.ts` + `renderer.ts` — visible-cell culling.
3. B1-04: `Canvas.tsx` — React decoupling.
4. B1-05: Tests in `coordinates.test.ts` / `renderer.test.ts`.

**Exit criteria:** Riley can wheel-zoom and hand-pan at 16× on 64×64 without visible stutter; `renderGrid` ≤1× per animation frame during continuous input.

### Batch 2 — Interaction polish (~2.5 pw, should ship next)

CSS transform pan, wheel RAF at source, checkerboard tile, pause ants during gesture, unified zoom anchor, StatusBar zoom, grid-line fade during gesture.

### Batch 3 — Deep cache (~3 pw, measure first)

Offscreen bitmap cache spike + optional dev perf overlay. Only if 128×128+ imports still fail after Batch 1+2.

## Recommended next action

Invoke **skill-implementer** (or **AGENT-recursive-implementer**) on **Batch 1 starting with B1-01 + B1-02** in `useCanvasRenderState.ts`: subscribe to `viewportStore` changes and route through existing `scheduleRedraw`; consolidate the two `useEffect` hooks that both call `redraw()` when viewport identity changes. Follow immediately with **B1-03** (`visibleCellBounds` in `coordinates.ts`, wired into `renderer.ts`). Validate with B1-05 tests and a manual Riley pass: 64×64 canvas, 16× zoom, continuous wheel + hand-pan for 5 seconds — no dropped frames perceptible, render call count ≤1 per frame.

## Open questions

- What is the **p95 imported grid size** among Riley projects? Drives whether Batch 3 ever ships.
- Should wheel zoom accumulate continuous delta vs discrete `ZOOM_STEP` during gesture? Decide during Batch 2 (B2-02).
- Is memoized `canvasIsBlank` sufficient, or should blank state move to editor store derived state?
- Spacebar pan: validate with Riley persona before P2 promotion.
