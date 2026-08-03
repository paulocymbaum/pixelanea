# Loop Backlog — Editor Canvas P0 (Zoom, Perf, Undo)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Feature area** | editor |
| **Trigger** | Taylor (Product Director) P0 triage: zoom broken, high-res paint lag, incomplete undo; user proposed C++ multithreading for live painting |
| **Horizon** | Next implementation loop (Loop 1 = shippable P0 fixes; Loop 2–3 = perf + undo architecture) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Three user-reported P0 issues target the editor canvas: zoom controls and wheel zoom appear non-functional; painting large grids is sluggish; undo only covers pixel `dispatch()` paths—not palette, frame, or filter edits. Code review confirms zoom math exists in `coordinates.ts` and `editorStore.ts`, but `Canvas.tsx` auto-calls `fitToView` on mount and on `gridWidth`/`gridHeight` changes, and toolbar zoom omits a viewport anchor. Performance pain is architectural on the frontend: `paintTool` emits one `PaintCellCommand` per cell per pointer-move, and `renderer.ts` redraws the full grid (up to two passes with color-filter preview) on every store update. `ARCHITECTURE.md` explicitly keeps interactive canvas in the browser; C++ `domain::PixelGrid` serves persistence/import/export—not per-pixel live paint.

## Dialogue summary

- **Jordan** flagged zoom as a likely frontend wiring/UX bug (not missing backend), with `fitToView` effects and unanchored toolbar zoom as prime suspects; rejected live C++ multithreading as a layer violation.
- **Sam** insisted Loop 1 must restore Riley's core jobs—see detail, paint without lag, undo mistakes—before any backend perf spike.
- **Batching:** Loop 1 = zoom fix + stroke batching + render throttle; Loop 2 = dirty-region render + undo expansion design; Loop 3 = full editor undo tiers; C++ multithreading deferred unless import/export batch jobs need it.
- **Undo MVP:** pixel strokes (batched) + palette mutations + destructive frame ops; defer viewport/tool chrome and filter-slider micro-undo.
- **RICE:** Zoom fix ranks highest (low effort, P0 blocker); frontend perf batch beats C++ thread ask; undo architecture is high impact but multi-week.

## Root-cause hypotheses

### P0-1 — Zoom in/out does not work

| # | Hypothesis | Evidence | Likelihood | Owner |
|---|------------|----------|------------|-------|
| H1 | **`fitToView` clobbers user zoom** — `Canvas.tsx` calls `fitToView` on mount (`ResizeObserver` setup) and again whenever `gridWidth`/`gridHeight` change, resetting `zoom`/`panX`/`panY` after the user adjusts viewport | `Canvas.tsx` lines 113–149 | Medium | frontend |
| H2 | **Toolbar zoom lacks anchor** — `ZoomControls` calls `zoomIn()`/`zoomOut()` with no anchor; math only changes `zoom` while pan stays fixed, so the grid can appear to zoom off-screen or "not change" on small canvases | `ZoomControls.tsx`, `coordinates.ts` zoomIn/zoomOut | High | frontend |
| H3 | **Wheel `preventDefault` ineffective** — React synthetic `onWheel` may be passive in some browsers; wheel zoom never applies though buttons might | `Canvas.tsx` handleWheel | Medium | frontend |
| H4 | **Pointer-events layering** — parent wrapper is `pointer-events-none`; child `ZoomControls` sets `pointer-events-auto` (correct pattern); failure would mean clicks never reach buttons | `Canvas.tsx` 265–267, `ZoomControls.tsx` 14–16 | Low (verify in browser) | frontend |
| H5 | **Store updates but render skipped** — `redraw` bails when `cssWidth/cssHeight <= 0`; zoom label could update while canvas stays static in broken layouts | `Canvas.tsx` redraw guard | Low | frontend |

**Jordan call:** H1+H2 are frontend-only, no OpenAPI/contract change; fix in one loop iteration is realistic.

### P0-2 — High-res painting performance

| # | Hypothesis | Evidence | Likelihood | Owner |
|---|------------|----------|------------|-------|
| H1 | **Per-cell dispatch on drag** — each pointer-move cell fires `dispatch(PaintCellCommand)` → new `Uint8Array` copy + full `renderGrid` | `paintTool.ts`, `editorStore.ts` dispatch | **Confirmed** | frontend |
| H2 | **Full-grid O(n) redraw** — `drawPixels` iterates every cell; with filters, `drawFilterPreview` runs a second full pass | `renderer.ts` drawPixels, renderGrid | **Confirmed** | frontend |
| H3 | **Undo stack churn** — one stack entry per painted cell caps at `UNDO_STACK_CAP=500` mid-stroke | `commands/types.ts` UNDO_STACK_CAP | High | frontend |
| H4 | **User-requested C++ multithreading** — would require per-pixel or per-stroke API round-trips; violates interactive paint stays client-side in `ARCHITECTURE.md` | ARCHITECTURE.md Canvas section | N/A (architectural mismatch) | — |

### P0-3 — Undo/redo incomplete

| # | Hypothesis | Evidence | Likelihood | Owner |
|---|------------|----------|------------|-------|
| H1 | **Undo stack is pixel-Command only** — `undo`/`redo` revert `Command` on `pixels` buffer; only `dispatch()` pushes stack | `editorStore.ts` undo/redo, `commands/types.ts` | **Confirmed** | frontend |
| H2 | **Palette edits bypass stack** — `addPaletteColor`, `updatePaletteColor`, `removePaletteColor` mutate state directly | `editorStore.ts` palette actions | **Confirmed** | frontend |
| H3 | **Frame/nav ops bypass stack** — `switchFrame`, `setFrameCount`, reorder paths do not record undo entries | `editorStore.ts` frame actions | **Confirmed** | frontend |
| H4 | **Per-cell undo feels "broken"** — long strokes create hundreds of undo steps; users expect one undo per stroke | paint tool + `PaintCellCommand` | High (UX) | frontend |

## Batched tasks

### Batch 1 — Restore canvas control (Must ship — Loop 1)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | **Diagnose and fix zoom** — reproduce wheel + toolbar + fit; stop `fitToView` from resetting user zoom except explicit fit or grid-dimension change intent; anchor toolbar zoom to viewport center | frontend | P0 blocker; Riley cannot inspect pixel detail; frontend-only per H1–H4 | — |
| B1-02 | **Stroke-batch paint/eraser** — accumulate cell changes during pointer down→up; emit single `PaintCellsCommand` on pointer up (fill/line already batch) | frontend | Cuts dispatch/redraw frequency by orders of magnitude; also improves undo granularity | — |
| B1-03 | **rAF render throttle during active stroke** — coalesce `redraw` to one frame while dragging; always flush on pointer up | frontend | Keeps UI responsive on 128×128+ grids without architectural churn | B1-02 |
| B1-04 | **Zoom regression tests** — unit tests for anchored toolbar zoom + guard against `fitToView` overwriting manual zoom; matrix case for wheel handler | frontend | Prevents P0 regression; evidence from `coordinates.test.ts` gap (no Canvas integration) | B1-01 |
| B1-05 | **Paint perf smoke test** — matrix or benchmark asserting ≤N redraws per stroke on 64×64 grid | frontend | Validates B1-02/B1-03; supports Taylor sign-off | B1-02, B1-03 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 5 | 0 | 5 |

### Batch 2 — Render path efficiency (Should — Loop 2)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | **Dirty-region or layer cache render** — cache static pixel layer in `OffscreenCanvas`/`ImageData`; blit on pan/zoom; repaint dirty rects on edit | frontend | Addresses H2 full-grid redraw at 256×256+; stays in `canvas/` layer | B1-02 |
| B2-02 | **Decouple filter preview from paint loop** — optional lower-frequency preview or post-stroke apply; avoid double full pass every move | frontend | Filter preview doubles render cost today | B2-01 |
| B2-03 | **Undo expansion — Tier A+B commands** — introduce `EditorCommand` (or extend `Command`) for palette add/update/remove and batched pixel strokes; wire `undo`/`redo` through unified applicator | frontend | Delivers MVP "editor undo" without snapshotting entire store | B1-02 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 2 | 0 | 3 | 0 | 3 |

### Batch 3 — Full editor history & deferred asks (Could — Loop 3+)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | **Undo Tier C — frame operations** — duplicate/set frame count/reorder/delete as reversible composite commands | frontend | Morgan/Riley frame workflows; needs snapshot slices of `framePixelsByIndex` | B2-03 |
| B3-02 | **Undo Tier D — filter settings** — record lighting/overlay slider changes (apply-to-pixels remains pixel command) | frontend | Lower priority than palette/frame | B2-03 |
| B3-03 | **Document non-undoable chrome** — zoom/pan, tool switch, panel collapse explicitly excluded per industry norm; copy in `content/` if users expect otherwise | frontend | Sets expectations; avoids scope creep | — |
| B3-04 | **C++ multithreading feasibility spike (import/export only)** — profile `image/` pixelate path; thread pool for offline batch if needed—not live paint API | backend | Honors user perf intent without breaking layers; only if import benchmarks fail SLO | — |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 3 | 1 | 3 | 0 | 4 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 — Zoom + stroke perf | 800 (all active editors) | 3 | 85% | 0.75 | **2720** | 1 |
| Batch 2 — Render cache + undo MVP | 500 (high-res + power users) | 2 | 70% | 2.0 | **350** | 2 |
| Batch 3 — Full history + C++ spike | 200 (animation + import users) | 1.5 | 50% | 3.5 | **43** | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` — Confidence as decimal.

### RICE notes

- Batch 1 wins decisively: zoom is a pure P0 blocker with sub-week effort and no contract churn.
- Sam would not promote Batch 3 despite user's C++ ask—live multithreaded painting fails the "responsive without round-trips" constraint; frontend batching delivers the same user outcome.
- Batch 2 is the strategic follow-on: without B2-01, 512×512 painting may still stutter after stroke batching alone.

### Initiative-level RICE (Taylor comparison table)

| Initiative | Reach | Impact | Confidence | Effort (pw) | RICE | Verdict |
|------------|-------|--------|------------|-------------|------|---------|
| Zoom fix (B1-01) | 800 | 3 | 90% | 0.25 | 8640 | **Ship Loop 1** |
| Frontend perf (B1-02–03 + B2-01) | 500 | 2.5 | 80% | 1.5 | 667 | **Ship Loop 1–2** |
| Undo architecture (B2-03 + B3-01) | 600 | 2 | 65% | 2.5 | 312 | Loop 2–3 |
| User C++ multithread live paint | 500 | 1 | 20% | 6+ | 17 | **Defer / reject** |

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 85 | 20 | high impact / low risk | Add zoom + stroke integration tests before merge |
| Batch 2 | 70 | 45 | high impact / low risk | Spike dirty-rect on 256×256; feature-flag filter preview decouple |
| Batch 3 | 55 | 78 | low impact / high risk | Frame undo needs memory cap for snapshots; C++ spike scoped to `image/` only, not new paint API |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │  B1    │
 50 │ B3  │  B2    │
 25 │     │        │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Undo scope definition

### Minimum viable "full editor undo" (ship target after Batch 2)

| Category | In MVP? | Notes |
|----------|---------|-------|
| Paint / eraser / fill / line strokes | **Yes** | One undo step per stroke (`PaintCellsCommand`) |
| Apply color filters to pixels | **Yes** | Already uses `dispatch`; keep as single command |
| Palette add / edit / remove | **Yes** | Tier B commands with index remapping on remove |
| Frame duplicate / count change / reorder / delete | **Loop 3** | Tier C; requires frame buffer snapshots |
| Zoom / pan / fit | **No** | View state, not document mutation |
| Tool switch / eyedropper pick | **No** | Ephemeral UI state |
| Filter slider tweaks (pre-apply) | **Defer** | Tier D; preview is non-destructive |
| Import / load project | **No** | Clears stack by design (existing behavior) |

### Pixel-only undo (current state — insufficient)

Only `editorStore.dispatch()` paths undo. Palette and frame mutations are irreversible via Ctrl+Z—conflicts with UX.md "Mistakes are cheap" and "unlimited undo stack (cap 500)" promise for Morgan's classroom persona.

## Feasibility — multithreaded C++ for live painting

| Criterion | Assessment |
|-----------|------------|
| Layer boundaries | **Reject for live paint.** `apps/web` canvas owns interactive grid (`Uint8Array`); `server/domain` is pure and reached via OpenAPI on debounced sync—not per pointer event. |
| Latency | Per-pixel HTTP/WebSocket round-trip would destroy stroke responsiveness. |
| User intent mapping | User wants smooth high-res painting → solved by stroke batching + render cache in browser, not thread pool in C++. |
| Acceptable C++ perf work | Offline `image/` pixelate, bundle encode, or bulk export—optionally multithreaded in Batch 3 spike **B3-04** only if benchmarks justify. |
| WASM compromise | Future option: compile domain codecs to WASM worker for batch transforms—not Loop 1–2 scope. |

## Engineering owner hints

| Task band | Primary owner | Layers touched |
|-----------|---------------|----------------|
| B1-01, B1-04 | Frontend | `canvas/Canvas.tsx`, `ZoomControls.tsx`, `coordinates.ts`, `editorStore.ts` |
| B1-02, B1-03, B1-05 | Frontend | `tools/paintTool.ts`, `tools/eraserTool.ts`, `tools/useToolInput.ts`, `canvas/renderer.ts` |
| B2-01, B2-02 | Frontend | `canvas/renderer.ts` only |
| B2-03, B3-01–02 | Frontend | `state/commands/`, `state/editorStore.ts` — no OpenAPI change |
| B3-04 | Backend | `server/image/`, `server/domain/` — no new paint endpoints |

## Decisions & open questions

### Agreed

- Loop 1 ships zoom fix + stroke batching + rAF throttle; no backend work.
- Live painting stays client-side per `ARCHITECTURE.md`; defer user's C++ multithreading ask.
- Undo MVP = batched pixels + palette commands; frame undo in Loop 3.
- Zoom/pan are not undoable.

### Deferred

- C++ multithreaded live pixel computation.
- Full time-ordered history of every UI action (panel toggles, tool switches).
- Filter slider micro-undo before apply.

### Open questions

- Does Taylor want 128×128 or 256×256 as the perf SLO grid for Loop 1 sign-off?
- Should `fitToView` on grid dimension change preserve relative zoom if user had manually zoomed? (Jordan: yes—store `userHasAdjustedViewport` flag.)
- Frame undo memory cap: max frames × grid bytes per snapshot—product limit needed before B3-01.

## Recommended next action

Implement **Batch 1** immediately on the frontend: assign one engineer to fix zoom (B1-01) with anchored controls and `fitToView` guard, in parallel with stroke batching (B1-02) and rAF redraw throttle (B1-03). Success for the next loop iteration: wheel and toolbar zoom visibly change grid scale and persist until fit or dimension change; painting a stroke on a 128×128 canvas feels continuous with O(1) undo steps per stroke; zoom and stroke perf tests green. Hand off undo architecture (B2-03) to a follow-on loop once Batch 1 is validated.

## Implementation status (Loop 1 Batch 1)

| ID | Status |
|----|--------|
| B1-01 | ✅ Done (2026-08-02) |
| B1-02 | ✅ Done (2026-08-02) |
| B1-03 | ✅ Done (2026-08-02) |
| B1-04 | ✅ Done (2026-08-02) |
| B1-05 | ✅ Done (2026-08-02) |
