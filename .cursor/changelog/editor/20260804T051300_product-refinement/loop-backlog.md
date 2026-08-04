# Loop Backlog — Select Tool Performance & Selection Actions Revamp

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-04 |
| **Feature area** | editor |
| **Trigger** | User request for select-tool performance + UX revamp; UX critique ([20260804T051000](.cursor/changelog/editor/20260804T051000_uxui-design-critique/uxui_design_critique.md)); recursive implementer launched for end-to-end delivery |
| **Horizon** | Next implementation loop (MVP shippable slice) + one follow-up loop |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Riley's primary job—"nudge this eye three pixels left"—is blocked because select is marquee-only (`selectTool.ts`), copy/cut/paste are keyboard-only (`shortcuts.ts`, `editorStoreClipboard.ts`), and marching-ants animation triggers full `renderGrid()` every RAF frame (`useCanvasRenderState.ts` lines 321–356). Maya/Leo UX critique ([20260804T051000](.cursor/changelog/editor/20260804T051000_uxui-design-critique/uxui_design_critique.md)) converged on P0: floating `SelectionActionBar`, first-class move, and render perf fixes with optional C++ offload via `POST /api/compute/selection`. OpenAPI today has no selection/compute routes; `PATCH /frames/{frameIndex}/cells` exists server-side but the frontend sync path still uses debounced full-frame `PUT` via `SyncCoordinator` (500ms debounce, latest-wins coalescing per ARCHITECTURE.md).

## Dialogue summary

- **Sam:** Riley and Morgan need pointer-visible actions at the selection; Casey must not depend on Ctrl+C. Batch 1 must ship bar + move + perceptible speed on 32×48 grids without waiting on C++.
- **Jordan:** Client-only partial repaint and bbox-only marching ants are prerequisite for move/paste drag; C++ compute is a follow-up for 128×128+ and must not block UI on localhost HTTP. Persist stays local-first: commands update `editorStore` immediately; sync lag is orthogonal unless we mistakenly await compute before applying pixels.
- **Sam:** Paste mode needs Place/Cancel on the bar (P1) but can trail move if cut→paste keyboard path stays.
- **Jordan:** Unified `POST /api/compute/selection` with operation discriminator beats three frame-scoped routes for v1; return delta `CellChange[]` + optional clipboard blob; client applies optimistically. WASM is fallback if handler slips—same contract.
- **Converged:** One loop ships **Batch 1** (render perf + move + action bar + paste-active variant); **Batch 2** C++ offload + P1 paste/clipboard UX; **Batch 3** P2 polish. Deferred: duplicate-in-place, selection resize handles, Edit menu duplication.

## Batched tasks

### Batch 1 — MVP: move + action bar + client render perf (P0)

| ID | Task | Scope | Rationale | Depends on | Status |
|----|------|-------|-----------|------------|--------|
| B1-01 | Decouple marching ants from full-grid RAF: overlay canvas layer or bbox-region repaint only; respect `prefers-reduced-motion` | frontend | P0 perf — `useCanvasRenderState` currently calls `redraw()` → full `renderGrid()` every frame | — | ✅ **Done** (2026-08-04) |
| B1-02 | Extend `repaintGridCells` path for paste preview and move preview (affected cells only, mirror active-stroke pattern in `renderer.ts`) | frontend | P0 perf — paste drag and move drag must stay <16ms/frame on Riley grids | B1-01 | ✅ **Done** (2026-08-04) |
| B1-03 | `MoveSelectionCommand` + store slice: extract masked pixels, clear source, apply at delta in one undo step; `moveSelectionPreview` state | frontend | P0 — no `moveSelection` exists; cut→paste is multi-step | B1-02 | ✅ **Done** (2026-08-04) |
| B1-04 | Select tool: pointer-down inside selection starts move preview; pointer-up commits; static outline during drag (no dash animation) | frontend | P0 golden path — drag-inside-to-move per UX critique | B1-03 | ✅ **Done** (2026-08-04) |
| B1-05 | `SelectionActionBar.tsx` under bbox (8px gap, flip above near frame strip, `min-width 160px`); Move / Copy / Cut / Paste / Deselect; paste-active Place + Cancel row | frontend | P0 discoverability — keyboard-only violates Morgan/Casey needs | B1-03 | ✅ **Done** (2026-08-04) |
| B1-06 | Wire bar + shortcuts: tooltips with `Ctrl+C/X/V`, Enter/Esc; `readOnly` hides bar; copy strings in `content/copy.ts` per critique | frontend | P0 — additive discovery without breaking power-user shortcuts | B1-05 | ✅ **Done** (2026-08-04) |
| B1-07 | Unit tests: move command, bar interactions, renderer partial repaint; extend `shortcuts.test.ts` for move mode | frontend | Regression guard for undo stack + readOnly | B1-04, B1-05 | ✅ **Done** (2026-08-04) |

### Batch 2 — C++ compute offload + P1 paste/clipboard UX

✅ **Done** (2026-08-04)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | OpenAPI: `POST /api/compute/selection` — body: `operation` (`extract` \| `move` \| `paste`), frame blob or cell refs, selection mask, delta; response: `CellChange[]` + optional clipboard payload | both | User-requested offload path; single contract surface vs three frame routes | B1-03 |
| B2-02 | Domain `selection_ops` in `server/domain/` + handler in `server/api/` — pure pixel loops, no SQL in domain | backend | ARCHITECTURE boundary — compute mirrors `extractSelectionPixels` / `buildPasteCellChanges` | B2-01 |
| B2-03 | Generated client + store actions: call compute for extract/move/paste on grids > threshold (e.g. 64×64 or >2048 masked cells); apply deltas locally immediately; never block paint on await | frontend | Main-thread offload for Alex/large sprites; optimistic UI | B2-02 |
| B2-04 | Status-bar feedback for ops >100ms (`selectionMoving`, subtle in-progress state on bar primary button) | frontend | P0 perf UX — critique target for large selections | B2-03 |
| B2-05 | Clear selection after cut **or** bar badge "Cut — paste to place"; paste-active variant already in B1-05 | frontend | P1 — outline after cut misreads as failed cut (`commitPaste` clears; cut does not) | B1-05 |
| B2-06 | Persistent clipboard indicator (bar Paste enabled state + optional status hint); reduce toast-only reliance | frontend | P1 discoverability | B1-05 |
| B2-07 | Backend tests: selection compute happy path, ellipse mask, edge clamp; API integration test | backend | Contract stability before frontend threshold flip | B2-02 |

### Batch 3 — P2 polish (could)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Arrow-key nudge of active selection bbox (before move mode), mirror paste nudge in `shortcuts.ts` | frontend | P2 — Riley micro-adjust without drag | B1-04 | 🔄 **In progress** (2026-08-04) |
| B3-02 | Selection size readout in bar footer (`24×18`, `font-mono`); gated behind View → technical info | frontend | P2 — Alex constraint persona | B1-05 | 🔄 **In progress** (2026-08-04) |
| B3-03 | Duplicate (copy-in-place offset +1 cell) as bar action | frontend | P2 — common sprite workflow | B1-03 | 🔄 **In progress** (2026-08-04) |
| B3-04 | Tap-outside canvas / bar × deselect; modifier hints in select-tool tooltip | frontend | P2 — clearer deselect; ellipse hints on canvas | B1-05 | 🔄 **In progress** (2026-08-04) |
| B3-05 | E2E: select → bar Move → drag → undo; select → Copy → Paste → Place | frontend | Workshop readiness for Morgan | B1-07 | 🔄 **In progress** (2026-08-04) |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 7 | 0 | 7 |
| Batch 2 | 2 | 3 | 2 | 7 |
| Batch 3 | 0 | 5 | 0 | 5 |

## RICE analysis (priority tiers & batches)

Score **batches** and **UX priority tiers** (P0/P1/P2 from critique). Confidence as decimal.

### UX priority tiers (critique findings)

| Tier | Theme | Reach (sessions/q) | Impact | Confidence | Effort (pw) | RICE | Rank |
|------|-------|-------------------|--------|------------|-------------|------|------|
| **P0** | Move + action bar + render perf (no C++) | 2500 | 2.0 | 0.78 | 2.5 | 1560 | 1 |
| **P0** | C++ `compute/selection` offload | 600 | 1.5 | 0.55 | 2.0 | 248 | 4 |
| **P1** | Paste mode clarity + cut/clipboard UX | 2200 | 1.0 | 0.85 | 0.75 | 2487 | 2 |
| **P1** | Partial-repaint-only (if not in P0) | — | — | — | — | — | — |
| **P2** | Nudge, duplicate, readout, deselect polish | 1200 | 0.5 | 0.80 | 1.0 | 480 | 3 |

*P1 partial-repaint row omitted — folded into P0 Batch 1 (B1-01, B1-02).*

### Implementation batches

| Batch | Reach (users/q) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|-----------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 2500 | 2.0 | 78% | 2.5 | 1560 | 1 |
| Batch 2 | 1800 | 1.25 | 70% | 2.0 | 787 | 2 |
| Batch 3 | 1200 | 0.5 | 80% | 1.0 | 480 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where Confidence is decimal (e.g. 78% → 0.78).

**RICE notes:**

- Batch 1 ranks first: delivers all critique P0 **user-visible** outcomes for Riley/Casey/Morgan on typical 32×48 grids without OpenAPI churn.
- P1 paste/clipboard UX (RICE 2487 as tier) is high value but **depends on bar shell** — shipped mostly in Batch 2 after MVP bar exists; Sam accepts deferring cut-outline fix one loop if move ships clean.
- C++ tier ranks lower RICE (248) — Jordan: localhost compute helps 128×128+ and future WASM/desktop parity; not required for Riley's 45-minute walk-cycle metric.
- Sam would promote Batch 2 early only if implementer profiling shows >100ms extract on 64×64 during dogfood — otherwise strict sequencing.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 88 | 42 | high impact / low risk | Spike overlay canvas in B1-01 first; keep move logic in domain-pure TS (`selectionExtraction.ts`) for testability |
| Batch 2 | 62 | 72 | high impact / high risk | Optimistic local apply always; compute is advisory; feature-flag threshold; do not await compute before `dispatch`; reconcile 409 via existing full PUT |
| Batch 3 | 28 | 18 | low impact / low risk | Ship only after Batch 1 green E2E |

```text
Impact ↑
100 │     │ B2 HI/HRI │
 75 │ B1  │           │
 50 │     │           │
 25 │ B3  │           │
  0 └─────┴───────────┴──→ Risk
    0    25   50   75  100
```

### Technical feasibility notes

| Topic | Assessment |
|-------|------------|
| **C++ `POST /api/compute/selection` vs WASM** | Preferred: C++ handler + pure `domain` selection ops — matches pixelate pipeline precedent (`server/image/`), keeps heavy loops off main thread without shipping WASM binary. WASM/worker acceptable interim with same request/response shape if Batch 2 slips. |
| **vs `PATCH /cells`** | Persist lane already has `patchFrameCells` server-side; frontend still uses full-frame `PUT` via `SyncCoordinator`. Compute endpoint returns **deltas for client command construction**, not a second persist path. Avoid duplicating persist in compute handler. |
| **Sync lag / unsynced pixels** | Edits are local-first: `dispatch(MoveSelectionCommand)` updates `editorStore.pixels` immediately; `scheduleFrameSync()` debounces 500ms. Risk: user switches frame before flush — existing `flushFrameSync()` on frame switch mitigates. Compute must **not** read server blob for preview (stale); send current client pixels in request or compute client-side until sync catches up. |
| **Undo** | Move must be one command (like cut's single `PaintCellsCommand` clear + separate clipboard). C++ path returns changes; client wraps in one undoable command. |
| **Dependency direction** | UI → generated OpenAPI client → `server/api/` → `domain/`. No SQL in domain; no direct SQLite from React. |

## Decisions & open questions

### Agreed

- **One loop MVP = Batch 1** — P0 outcomes without C++ contract change.
- **Batch 2** adds `POST /api/compute/selection` + P1 clipboard/paste clarity.
- Action bar placement: below bbox, flip above near frame strip; reuse `ZoomControls` token stack (`rounded-panel`, `bg-elevated/95`).
- Move drag uses static outline; marching ants only when idle.
- Icons default on bar; labels at `sm:` or wide selection (Maya/Leo compromise).

### Deferred

- Selection resize handles (outline drag resizes) — v2.
- Edit menu / top-toolbar Copy/Cut/Paste — bar is primary chrome for v1.
- Frontend adoption of `PATCH /cells` for sync — separate perf initiative; not this feature's gate.
- `POST .../frames/{id}/selection/*` tri-route — superseded by unified compute route.

### Open questions

- Exact compute threshold: 64×64 bbox vs masked cell count vs fixed 2048 cells?
- Move vs overlap: commit when destination overlaps source (merge rules) — match paste (`buildPasteCellChanges`) or reject?
- Taylor `product_direction.md`: icon-only vs labels default for workshop pilot?

## Recommended next action

**Invoke recursive implementer on Batch 1 in order: B1-01 → B1-02 → B1-03 → B1-04 → B1-05 → B1-06 → B1-07.** Frontend owns all seven tasks; no OpenAPI change in this loop. Success: Riley can select a 32×32 region, tap **Move** on the floating bar (or drag inside selection), reposition with smooth partial repaint, undo in one step; Copy/Cut/Paste discoverable on bar; marching ants no longer peg CPU on idle selection. Dogfood on 128×128 after Batch 1; if extract/move exceeds 100ms, schedule Batch 2 (B2-01–B2-07) as the next loop. Taylor synthesizes this backlog with [uxui_design_critique.md](.cursor/changelog/editor/20260804T051000_uxui-design-critique/uxui_design_critique.md) into `product_direction.md`.

## P0 / P1 outcomes table

| Priority | Outcome | Shipped in | Acceptance signal |
|----------|---------|------------|-------------------|
| **P0** | First-class move selection (drag or bar) | **Batch 1** | Single undo step; no cut→paste required to reposition |
| **P0** | Floating `SelectionActionBar` under selection | **Batch 1** | Move, Copy, Cut, Paste, Deselect visible; paste-active Place/Cancel |
| **P0** | Render perf: no full-grid RAF for marching ants | **Batch 1** | Profiler: idle selection does not call full `renderGrid` per frame |
| **P0** | Partial repaint for move/paste preview | **Batch 1** | `repaintGridCells` (or equivalent) on preview drag |
| **P0** | C++ offload for extract/move/paste compute | **Batch 2** | `POST /api/compute/selection` used above threshold; UI stays optimistic |
| **P1** | Paste mode explicit (Place/Cancel on bar) | **Batch 1** (bar variant) + **Batch 2** (badge polish) | Casey completes paste without reading status bar |
| **P1** | Cut/clipboard state matches outline | **Batch 2** | Clear selection or "paste to place" badge after cut |
| **P1** | Clipboard presence visible | **Batch 2** | Paste disabled when empty; persistent hint |
| **P1** | Loading feedback >100ms | **Batch 2** | Status/bar in-progress for large selections |
| **P2** | Selection nudge, duplicate, readout, deselect polish | **Batch 3** | Optional E2E in B3-05 |

## Recommended next shippable batch

**Batch 1 — MVP: move + action bar + client render perf** — seven frontend tasks, ~2.5 person-weeks, zero contract churn, delivers all P0 UX outcomes except C++ offload and most P1 clipboard polish. This is the single loop Taylor should treat as the **release slice** for select-tool revamp v1.

### Implementer invocation order (Batch 1)

| Step | ID | Agent focus |
|------|-----|-------------|
| 1 | B1-01 | 🔄 **In progress** (2026-08-04) | Canvas overlay / bbox marching ants |
| 2 | B1-02 | 🔄 **In progress** (2026-08-04) | Partial repaint for previews |
| 3 | B1-03 | 🔄 **In progress** (2026-08-04) | `MoveSelectionCommand` + store |
| 4 | B1-04 | 🔄 **In progress** (2026-08-04) | `selectTool` move pointer routing |
| 5 | B1-05 | 🔄 **In progress** (2026-08-04) | `SelectionActionBar` component + layout |
| 6 | B1-06 | 🔄 **In progress** (2026-08-04) | Copy strings, tooltips, shortcuts wiring |
| 7 | B1-07 | 🔄 **In progress** (2026-08-04) | Tests |
