# Loop Backlog — Editor State Performance + Refactor Debt

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Feature area** | editor |
| **Trigger** | User requested `/AGENT-product-refinement` for C++ state performance + React offload; follow-up to add a batch for tech debt left after repeated refactors |
| **Horizon** | Next batch / sprint (Batch 1 + partial Batch 4 quick-wins first; larger debt items span 2–3 sprints) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | `.cursor/changelog/editor/20260802T223000_product-refinement/loop-backlog.md` |

## Context summary

Pixelanea's editor keeps **instant paint/undo in the browser** while persistence flows through `persist.ts` → `SyncCoordinator` (500ms debounce, full-frame `PUT`). Recent uncommitted work (`strokeSession.ts`, `paintStrokePerf.test.ts`, Canvas RAF stroke redraw) targets React/store churn during painting. C++ today re-encodes and SQLite-writes on every sync with no in-memory frame cache.

A repo survey surfaced **accumulated refactor debt**: `editorStore.ts` at ~995 lines mixing six concerns, dual `pixels` / `framePixelsByIndex` buffers with manual sync at 10+ call sites, four parallel QA matrix harnesses (~4.5k lines) duplicating reset logic, triplicated `ToolContext` builders, incomplete stroke migration (14 modified + 5 untracked files), dead exports, and incomplete project-settings sync (fps/loop only flush on bundle save). This refinement adds **Batch 4** to pay down that debt without blocking performance batches.

## Dialogue summary

- **Jordan** anchored the constraint: canvas + pointer routing + undo stay client-side; C++ optimizes persistence, not per-pointer mutations.
- **Sam** agreed the user-visible win is smooth painting for Riley; backend work matters only if autosave or frame-switch causes jank.
- **Jordan** flagged C++ hotspot: JSON `number[]` expansion + `PixelBlobCodec::encode` on every debounced `putFrame`.
- **Sam** pushed on delta sync; **Jordan** countered multi-week contract risk; incremental binary transport ships faster.
- **Batching (performance):** Batch 1 = stroke batching + preview decoupling. Batch 2 = binary transport + server cache. Batch 3 = delta spike.
- **Batching (debt — new round):** **Jordan** argued debt is blocking velocity: every new feature touches `editorStore.ts`; harness resets drift when fields are added (`viewportUserAdjusted` already missed in some paths); `advancePlaybackFrame` never writes outgoing frame back to `framePixelsByIndex` — a latent bug. **Sam** accepted debt paydown but insisted Batch 4 quick-wins ship **after** Batch 1 lands (stroke migration must finish before consolidating preview paths). **Jordan** proposed Batch 4 split: quick-wins (context builder, dead code, harness presets) parallel to Batch 2; structural (`editorStore` decomposition) only after Batch 1 + quick-wins. **Sam** tied structural debt to Morgan's workshop: fewer mystery regressions when demoing frame switch + animation.
- **RICE:** Batch 1 still #1 for users. Sam promotes Batch 4 for **developer velocity** — run quick-wins right after B1-01; defer B4-08 until preview path is stable.

## Batched tasks

### Batch 1 — Smooth painting (must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | ✅ Done (2026-08-02) | Land `StrokeSession` + `useToolInput` stroke batching: one `PaintCellsCommand` / undo step per pointer gesture | frontend | In-flight work (`strokeSession.ts`, `paintStrokePerf.test.ts` asserts ≤64 preview batches, 1 undo step for 64-cell stroke) | — |
| B1-02 | ✅ Done (2026-08-02) | Decouple stroke **preview** from full `editorStore.previewCells` updates — imperative preview buffer or canvas overlay layer; commit to store only on pointer-up | frontend | `previewCells` clones full `Uint8Array` + `writeFramePixels` per batch (`editorStore.ts` L559–582) | B1-01 |
| B1-03 | ✅ Done (2026-08-02) | Keep RAF-coalesced redraw during `isStrokeActive` (`Canvas.tsx` L130–146); add dirty-rect or stroke-layer render | frontend | Canvas already gates stroke redraw on `strokePreviewTick` | B1-02 |
| B1-04 | ✅ Done (2026-08-02) | Extract viewport state (`zoom`, `panX`, `panY`, `viewportUserAdjusted`) to dedicated store slice | frontend | `editorStore.ts` ~995 lines; `editorStore.viewport.test.ts` already exists | — |
| B1-05 | ✅ Done (2026-08-02) | Narrow Canvas Zustand selectors during active stroke; avoid `pixels` subscription while `isStrokeActive` | frontend | `Canvas.tsx` L28–44 subscribes to `pixels` directly | B1-02 |

### Batch 2 — Persistence path efficiency (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Add **binary frame body** to OpenAPI (`putFrame` / `getFrame`); generate TS client | both | `pixelsToApi` expands `Uint8Array` → `number[]` JSON (`api/frames.ts`) | B1-01 | ✅ Done (2026-08-02) |
| B2-02 | ✅ Done (2026-08-02) | Server **in-memory frame cache** per open `ProjectId`; skip encode+write when content hash unchanged | backend | `frame_repository.cpp` always `PixelBlobCodec::encode` + SQLite UPDATE | B2-01 |
| B2-03 | ✅ Done (2026-08-02) | Frontend: send raw bytes in `saveFrame`; skip JSON expansion in snapshot path | frontend | Completes binary lane through `SyncCoordinator` | B2-01 |
| B2-04 | ✅ Done (2026-08-02) | Perf regression tests: frame PUT encode time + payload size for 64×64 and 128×128 | both | Locks Batch 2 gains | B2-02 |

### Batch 3 — Delta sync exploration (could ship later)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | ✅ Done (2026-08-02) | Spike: `PATCH /frames/{frameIndex}/cells` or stroke-batch endpoint; document vs full-PUT trade-offs | both | `StrokeSession.getChanges()` is natural delta source | B2-03 |
| B3-02 | ✅ Done (2026-08-02) | Extend `SyncCoordinator` with delta lane + full-PUT fallback on flush/conflict | frontend | `syncCoordinator.ts` only enqueues full `FrameSnapshot` | B3-01 |
| B3-03 | ✅ Done (2026-08-02) | Server apply-delta in domain layer (pure grid merge) + cache update | backend | Keeps domain pure | B3-01 |

### Batch 4 — Refactor debt cleanup (should ship alongside Batch 2)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B4-01 | ✅ Done (2026-08-02) | Close the stroke migration | frontend | stroke files coherent | B1-01 |
| B4-02 | ✅ Done (2026-08-02) | Consolidate `ToolContext` construction into `tools/context.ts` — one `buildToolContextFromStore()`; `testContext.ts` and `paintMatrixHarness` import it | frontend | Triplicated builders in `useToolInput.ts`, `paintMatrixHarness.ts`, per-test stubs | B4-01 |
| B4-03 | ✅ Done (2026-08-02) | Remove dead code + unify commands: delete unused `readFramePixels` export (`frameCache.ts`); migrate harnesses from `PaintCellCommand` to `PaintCellsCommand` | frontend | Zero call sites for `readFramePixels`; harnesses still dispatch single-cell commands | — |
| B4-04 | ✅ Done (2026-08-02) | Fix **dual-buffer invariant** (`pixels` vs `framePixelsByIndex`): add `ensureFrameCached`; playback cache regression test | frontend | 10+ manual `writeFramePixels` call sites | B1-01 |
| B4-05 | ✅ Done (2026-08-02) | Consolidate QA matrix harnesses: shared `qa/editorFixtures.ts` with composable presets (`resetEditor`, `withFrames`, `withSyncMock`) | frontend | Four harnesses each manually reset ~25–40 store fields (~4.5k lines total) | B4-02 |
| B4-06 | ✅ Done (2026-08-02) | Derive `syncStatus` / `syncError` via selector or thin `syncStore` — remove `reconcileDerivedSync` at ~15 mutation sites | frontend | Six sync fields with manual reconciliation in `editorStore.ts` | — |
| B4-07 | ✅ Done (2026-08-02) | Wire **debounced `scheduleProjectSettingsSync`** for fps/loop changes; surface lane status or fold into `bundleDirty` | both | `setAnimationFps` / `setAnimationLoop` only `set()` — no autosave until bundle save | — |
| B4-08 | ✅ Done (2026-08-02) | Decompose `editorStore` into focused slices (frames, playback, palette, sync) — composed selectors for components | frontend | God object at 995 lines; tests already fragmenting (`editorStore.*.test.ts`) | B1-04, B4-06 |
| B4-09 | ✅ Done (2026-08-02) | Extract `useCanvasRenderState()` + `useStrokePreviewRedraw()` hooks; reduce 15+ `useEditorStore` selectors in `Canvas.tsx` | frontend | 336-line Canvas is convergence point for frame, filter, onion-skin, viewport, stroke | B1-05, B4-01 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 5 | 0 | 5 |
| Batch 2 | 1 | 1 | 2 | 4 |
| Batch 3 | 1 | 1 | 1 | 3 |
| Batch 4 | 0 | 7 | 1 | 8 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 | 2 (high — core paint UX) | 85% | 1.5 | 906.7 | 1 |
| Batch 2 | 600 | 1.5 (medium — autosave/frame switch) | 70% | 2.5 | 252.0 | 2 |
| Batch 4 | 50 (dev team) | 2 (high — velocity + regression prevention) | 75% | 2.0 | 37.5 | 3 |
| Batch 3 | 400 | 2 (high if proven) | 45% | 4.0 | 90.0 | 4 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where `Confidence` is expressed as a decimal.

**RICE notes:**

- Batch 1 user RICE dominates; no override.
- **Sam promotes Batch 4** despite low Reach (50 = dev team): impact on regression rate and sprint throughput is massive — harness resets that omit new fields create silent test drift.
- Batch 4 **Reach is intentionally low** (internal); B4-04 playback cache gap could surface as user-visible frame corruption during animation preview.
- Batch 2 RICE rises if profiling after B1 shows JSON `putFrame` dominates frame-switch latency.
- Batch 4 quick-wins (B4-02, B4-03, B4-05, B4-06) can start after B1-01; B4-08 (store decomposition) waits for B1 preview decoupling.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 72 | 22 | high impact / low risk | Preview-only path behind `isStrokeActive`; extend `paintStrokePerf.test.ts` |
| Batch 4 | 58 | 35 | high impact / low risk | Land stroke migration (B4-01) before harness consolidation; B4-08 in incremental PRs; full matrix suite after each B4 PR |
| Batch 2 | 55 | 48 | high impact / low risk | OpenAPI version bump; binary round-trip integration test; cache invalidated on project close |
| Batch 3 | 65 | 78 | high impact / high risk | Time-boxed spike only; full-PUT fallback mandatory |

```text
Impact ↑
100 │     │          │ HI/HRI │
 75 │     │          │  B3    │
 50 │     │ HI/LR    │        │
 25 │     │ B1 B4 B2 │        │
  0 └─────┴──────────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Paint hot path stays in browser** — Tools → Command → local grid.
- **Client-side undo remains** — server-side undo deferred.
- **Batch 1 ships without Batch 2 or Batch 4 structural work** — preview decoupling is independent.
- **Batch 4 quick-wins (B4-02, B4-03, B4-05, B4-06) can start after B1-01 lands** — do not block on Batch 2.
- **Batch 4 structural items (B4-08, B4-09) wait for B1 completion** — avoid refactoring store shape while preview path is in flux.
- **Full-frame PUT remains default** until Batch 3 spike proves delta savings.
- **SyncCoordinator stays the sole persist entry** — no tool/canvas direct `saveFrame` calls.

### Deferred

- Server-side command history / undo stack.
- WASM or SharedArrayBuffer pixel grid.
- WebSocket binary stroke streaming.
- Moving canvas rendering to C++.
- Partial PATCH in production without full-PUT fallback.
- Full rewrite of matrix E2E tests into Playwright (harness consolidation only).

### Open questions

- Should B4-08 use **multiple Zustand stores** or a **single composed store with slices**?
- Is `advancePlaybackFrame` cache gap a **confirmed bug** or intentional? Needs repro test in B4-04.
- Does fps/loop autosave belong in the same debounce lane as palette, or separate `projectSettings` lane?
- After harness consolidation, retire individual `*MatrixHarness.ts` files or keep as thin re-exports?

## Recommended next action

**Loop complete (2026-08-02).** All Batch 1–4 performance and refactor items are done. Delta sync spike documented at `.cursor/skill-outputs/editor/sync/20260802T235900_pixelanea-frontend-standards/delta-sync-spike.md`. B1-03 stroke overlay uses incremental `repaintGridCells` during active strokes (full redraw when color filters active or stroke ends).

**Deferred:** Playwright E2E for delta sync; WebSocket stroke streaming; server-side undo; adaptive delta threshold.

