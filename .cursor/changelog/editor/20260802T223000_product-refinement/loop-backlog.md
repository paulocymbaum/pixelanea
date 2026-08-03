# Loop Backlog — Editor State Performance (C++ + React)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Feature area** | editor |
| **Trigger** | User requested `/AGENT-product-refinement` to improve C++ state-management performance and reduce React load by shifting performance-critical work to C++ |
| **Horizon** | Next batch / sprint (assumes in-flight `strokeSession` work lands first; no release-blocker evidence) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Pixelanea's editor keeps **instant paint/undo in the browser** (`editorStore.dispatch`, client undo stack cap 500) while persistence flows through `persist.ts` → `SyncCoordinator` (500ms debounce, full-frame `PUT` lanes). Recent uncommitted work (`strokeSession.ts`, `paintStrokePerf.test.ts`, Canvas RAF stroke redraw) targets **React/store churn during painting** — the dominant 60fps hot path. C++ today is **stateless per request**: `FrameRepository::put` re-encodes the full grid with `PixelBlobCodec` and writes SQLite on every sync; there is **no server-side frame cache** or delta API. Architecture explicitly keeps canvas rendering in-browser and mandates full blob sync (no partial PATCH today). This refinement batches incremental frontend wins first, then bounded backend/sync optimizations, deferring server-side undo and WASM.

## Dialogue summary

- **Jordan** anchored the constraint: canvas + pointer routing + undo must stay client-side for sub-16ms feedback; moving pixel ownership to C++ would add round-trip latency and violate ARCHITECTURE.md's "canvas stays in browser" rule.
- **Sam** agreed the user-visible win is **smooth painting for Riley** (primary persona); backend work only matters if autosave or frame-switch causes jank or data-loss anxiety — not if it slows the brush.
- **Jordan** flagged the real C++ hotspot: every debounced `putFrame` JSON-deserializes a `number[]`, encodes RLE, and hits SQLite — with **no in-memory decoded cache** (`frame_repository.cpp` always `PixelBlobCodec::encode`).
- **Sam** pushed on delta sync; **Jordan** countered that OpenAPI + client + coordinator + migration is a multi-week contract change; **incremental binary/full-frame optimization** ships faster with lower rollback risk.
- **Batching consensus:** Batch 1 = land stroke batching + decouple preview from Zustand (user-visible 60fps). Batch 2 = binary transport + server frame cache + skip no-op writes (persistence perf). Batch 3 = optional delta/stroke-batch API spike. **Deferred:** server-side undo, WASM grid, WebSocket stroke channel.
- **RICE:** Batch 1 ranks highest (high confidence, low effort, direct paint UX). Batch 2 second (medium effort, helps large grids + animation). Batch 3 lowest (high effort, needs spike).

## Batched tasks

### Batch 1 — Smooth painting (must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Land `StrokeSession` + `useToolInput` stroke batching: one `PaintCellsCommand` / undo step per pointer gesture | frontend | In-flight work (`strokeSession.ts`, `paintStrokePerf.test.ts` asserts ≤64 preview batches, 1 undo step for 64-cell stroke); eliminates per-cell dispatch during drag | — |
| B1-02 | Decouple stroke **preview** from full `editorStore.previewCells` updates — imperative preview buffer or canvas overlay layer; commit to store only on pointer-up | frontend | `previewCells` clones full `Uint8Array` + `writeFramePixels` per batch (`editorStore.ts` L559–582), triggering Canvas subscriber churn; ARCHITECTURE requires 60fps paint in browser | B1-01 |
| B1-03 | Keep RAF-coalesced redraw during `isStrokeActive` (`Canvas.tsx` L130–146); add dirty-rect or stroke-layer render so zoom/pan subscribers don't full-grid repaint | frontend | Canvas already gates stroke redraw on `strokePreviewTick`; extend to minimize `renderGrid` work during drag | B1-02 |
| B1-04 | Extract viewport state (`zoom`, `panX`, `panY`, `viewportUserAdjusted`) to dedicated store slice or `useSyncExternalStore` module | frontend | `editorStore.ts` ~995 lines; `editorStore.viewport.test.ts` already covers viewport flags — isolates zoom/pan from pixel mutations so chrome doesn't re-render on paint | — |
| B1-05 | Narrow Canvas Zustand selectors: subscribe to `strokePreviewTick` / preview ref only during active stroke; avoid `pixels` subscription while `isStrokeActive` | frontend | `Canvas.tsx` L28–44 subscribes to `pixels` directly — defeats stroke batching if preview still mutates `pixels` | B1-02 |

### Batch 2 — Persistence path efficiency (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Add **binary frame body** to OpenAPI (`putFrame` / `getFrame`): `application/octet-stream` or compact base64 field; generate TS client | both | Today `pixelsToApi` expands `Uint8Array` → `number[]` JSON (`api/frames.ts` L22–48); 32×32 = 1KB acceptable, 256×256 = 64KB+ JSON overhead per autosave | B1-01 |
| B2-02 | Server **in-memory frame cache** per open `ProjectId`: hold decoded `std::vector<uint8_t>` after first GET/PUT; `FrameRepository::put` compares content hash before `PixelBlobCodec::encode` + SQLite UPDATE | backend | `frame_repository.cpp` L114 always encodes+writes; no cache grep hits in `server/`; reduces CPU on debounced full-frame sync | B2-01 |
| B2-03 | Frontend: send raw bytes in `saveFrame`; avoid `Array.from` clone in hot snapshot path where possible (`snapshots.ts` L29 still clones — keep for correctness but skip JSON expansion) | frontend | Completes end-to-end binary lane through `SyncCoordinator` without changing debounce/coalesce semantics | B2-01 |
| B2-04 | Add perf regression tests: frame PUT encode time + payload size budget for 64×64 and 128×128 grids | both | No perf tests on server today; locks Batch 2 gains | B2-02 |

### Batch 3 — Delta sync exploration (could ship later)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Spike: `PATCH /frames/{frameIndex}/cells` or `POST .../strokes` accepting RLE/cell delta list; document vs full-PUT trade-offs | both | ARCHITECTURE.md L209 mandates full blobs today; stroke batching on client (`StrokeSession.getChanges()`) is natural delta source — needs contract + coordinator redesign | B2-03 |
| B3-02 | Extend `SyncCoordinator` with delta lane: coalesce cell changes per debounce window, fallback to full snapshot on conflict/flush | frontend | `syncCoordinator.ts` only enqueues full `FrameSnapshot`; delta requires epoch + revision semantics | B3-01 |
| B3-03 | Server apply-delta in domain layer (pure grid merge) + cache update without full re-decode | backend | Keeps domain pure; avoids HTTP in domain | B3-01 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 5 | 0 | 5 |
| Batch 2 | 1 | 1 | 2 | 4 |
| Batch 3 | 1 | 1 | 1 | 3 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 (all active editors) | 2 (high — core paint UX) | 85% | 1.5 | 906.7 | 1 |
| Batch 2 | 600 (large grids + multi-frame) | 1.5 (medium — autosave/frame switch) | 70% | 2.5 | 252.0 | 2 |
| Batch 3 | 400 (power users, 128×128+) | 2 (high if proven) | 45% | 4.0 | 90.0 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where `Confidence` is expressed as a decimal (e.g. 85% → 0.85).

**RICE notes:**

- Batch 1 wins on confidence: code and tests already exist in git status; finishing preview decoupling is the main unknown.
- Sam would **not** promote Batch 3 despite paint pain on huge canvases — workshop pilots (Morgan) need stable save semantics before contract churn.
- Batch 2 RICE rises if profiling shows JSON `putFrame` dominates frame-switch latency on 64×64×32 animation projects.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 72 | 22 | high impact / low risk | Keep commit path identical (`dispatch` on pointer-up); preview-only path behind `isStrokeActive` flag; extend `paintStrokePerf.test.ts` |
| Batch 2 | 55 | 48 | high impact / low risk | OpenAPI version bump; integration test round-trip binary GET/PUT; cache invalidated on `resetPersistState` / project close |
| Batch 3 | 65 | 78 | high impact / high risk | Time-boxed spike only; no production default until flush/conflict matrix tested; keep full-PUT fallback |

```text
Impact ↑
100 │     │          │ HI/HRI │
 75 │     │          │  B3    │
 50 │     │ HI/LR    │        │
 25 │     │ B1  B2   │        │
  0 └─────┴──────────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Paint hot path stays in browser** — Tools → Command → local grid; C++ does not own per-pointer mutations (ARCHITECTURE.md canvas section).
- **Client-side undo remains** — Server-side undo deferred; `history_checkpoints` (ARCHITECTURE.md L553) is session recovery, not interactive undo.
- **Batch 1 ships without Batch 2** — Stroke batching + preview decoupling is independently valuable.
- **Full-frame PUT remains default** until Batch 3 spike proves delta savings outweigh contract complexity.
- **SyncCoordinator stays the sole persist entry** — no tool/canvas direct `saveFrame` calls (pixelanea-core.mdc).

### Deferred

- Server-side command history / undo stack.
- WASM or SharedArrayBuffer pixel grid in the browser.
- WebSocket binary stroke streaming (WebSocket today is animation preview per ARCHITECTURE.md).
- Moving canvas rendering to C++.
- Partial PATCH in production without full-PUT fallback and revision IDs.

### Open questions

- What is the **largest supported grid** for v1 (32×32 vs 128×128)? Drives Batch 2 priority vs Batch 3.
- Should binary `putFrame` use **raw octet-stream** or **base64-in-JSON** for httplib/TS client ergonomics?
- Does `previewCells` need to update `framePixelsByIndex` during preview, or only active `pixels` + overlay?
- Profile target: is jank from **Zustand subscribers**, **canvas render**, or **main-thread JSON stringify** on sync?

## Recommended next action

**Implement Batch 1 first (frontend team):** merge the in-flight `StrokeSession` work, then implement B1-02/B1-05 so stroke preview no longer clones the full grid into Zustand on every pointer-move — use an imperative preview layer and commit via `dispatch` on pointer-up only. Success for the next loop iteration: `paintStrokePerf.test.ts` stays green, manual 64×64 drag feels continuous at 60fps, and React profiler shows no `editorStore` subscribers firing on each preview batch except Canvas stroke layer. Schedule a 2-hour profiling pass after B1 lands to quantify JSON `putFrame` cost and decide whether Batch 2 binary transport jumps the queue.
