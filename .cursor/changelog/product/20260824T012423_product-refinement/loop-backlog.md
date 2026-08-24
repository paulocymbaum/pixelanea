# Loop Backlog — Post-SWOT durability & delivery focus

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-24 |
| **Feature area** | product |
| **Trigger** | Code-review SWOT of whole system (architecture, layers, harness) + invocation of product-refinement agent |
| **Horizon** | Next 2–3 shippable batches (post-v1) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — (complements; does not replace) `.cursor/changelog/editor/20260805T231910_product-refinement/loop-backlog.md` (canvas perf) and `.cursor/changelog/distribution/20260807T170346_product-refinement/loop-backlog.md` |

## Context summary

A system SWOT prioritized layer discipline and SyncCoordinator as strengths, and client-only undo + async sync + abrupt process kill as the highest product risks. Several mitigations already shipped: `bundleDirty` status, navigation guards with **Save, then continue**, `beforeunload` warn in `App.tsx`, canvas viewport RAF coalescing and `visibleCellBounds` culling. Remaining gap is **quit/kill durability** (shell terminates server without a guaranteed flush) and **sync failure visibility**. This loop must not invent new architectural layers, server-side undo, or auth. Canvas Batch 1 from the Aug 5 backlog is treated as largely landed; distribution Win/mac remains owned by the distribution backlog.

## Dialogue summary

- **Jordan:** Protect dependency direction and SyncCoordinator; audit flush call sites; shell `kill` on exit is the concrete hole; no OpenAPI undo history or delta PATCH this loop.
- **Sam:** Batch 1 must be user-visible trust for Riley (primary) and Morgan (workshop) — no silent loss on close/quit.
- **Jordan:** Prefer graceful shutdown (WebView flush-with-timeout → then terminate) over new persistence subsystems; risk is cross-process race.
- **Sam:** Batch 2 = feel/polish (onion skin default per `BACKLOG.md`); Batch 3 = harness fast-path (agent cost), not persona pixels.
- **Converged:** Durability Batch 1 first (highest RICE); defer Windows/signing to distribution; cut server history / auth / new packages from this loop.

## Batched tasks

### Batch 1 — Durability close-the-loop (must ship)

| ID | Status |
|----|--------|
| B1-01 | ✅ Done |
| B1-02 | ✅ Done |
| B1-03 | ✅ Done |
| B1-04 | ✅ Done |

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Inventory every path that must `flush*` before leave/read (frame switch, save/export, playback start, import nav, project open/new `resetPersistState`) and document gaps vs ARCHITECTURE sync table | frontend | SWOT High: any missed flush = divergence; evidence before coding | — |
| B1-02 | Surface SyncCoordinator / PUT failures in status bar (or toast) when frame/palette persist fails; keep `isDirty` until success | frontend | Users currently may think paint is safe when server rejected write | B1-01 |
| B1-03 | Desktop shell graceful quit: request WebView/editor flush (or block quit while dirty) before `server.rs` child kill; timeout then force-kill with warning | both | Evidence: shell terminates server on exit; `beforeunload` cannot await `flushAllSync` | B1-01 |
| B1-04 | Extend project I/O / persist matrix (and one E2E if cheap): dirty frame-switch flush, dirty-quit/warn, failed PUT leaves dirty | frontend | Mechanical gate for SWOT regression class | B1-02, B1-03 |

### Batch 2 — Editor feel (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Enable onion skin by default when `frameCount > 1` (remove feature-flag gate per `BACKLOG.md`) | frontend | Morgan/Riley animation clarity; already listed Active in BACKLOG | — |
| B2-02 | Verify Aug 5 canvas Batch 1 leftovers (double-redraw, React viewport decoupling); ship only remaining gaps, do not re-implement RAF/culling | frontend | Prior backlog; code already has `useViewportInteraction` coalesce + `visibleCellBounds` | — |
| B2-03 | Optional: CSS-transform pan preview (prior Batch 2) only if B2-02 shows residual pan jank on large grids | frontend | High effort vs feel; cut if B1 slips | B2-02 |

### Batch 3 — Delivery tax reduction (could)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Document / rule a **harness fast path** (skip recursive-implementer for docs/typos/single-file) in HARNESS.md | both | SWOT: process overhead; zero pixel impact but protects velocity | — |
| B3-02 | Wire one CI job to consume a canonical `test_matrix_unit.md` or `test.md` smoke (not full agent loop) | both | Durable gates vs chat-only EVALUATION | B3-01 |
| B3-03 | Graphify hub hygiene note (noise hubs) — optional graphify update docs only | both | Reduces agent mis-orientation; lowest priority | — |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 3 | 1 | 4 |
| Batch 2 | 0 | 3 | 0 | 3 |
| Batch 3 | 0 | 0 | 3 | 3 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 80 (Riley + Morgan sessions) | 2 | 70 | 1.5 | 74.7 | 1 |
| Batch 2 | 60 (animation users) | 1 | 85 | 1.0 | 51.0 | 2 |
| Batch 3 | 5 (maintainers / agent runs) | 0.5 | 80 | 1.0 | 2.0 | 3 |

**RICE notes**

- Batch 1 wins on Reach × Impact; Confidence 70% until shell quit protocol is spiked.
- Sam would still ship B2-01 (onion default) even if Batch 1 slips a day — low effort, workshop-visible.
- Batch 3 ranks last on RICE but Jordan wants B3-01 soon to stop over-orchestration burning context on tiny fixes.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 85 | 55 | high impact / medium risk | Flush-with-timeout then kill; keep warn dialog if flush fails; matrix + E2E for dirty quit |
| Batch 2 | 45 | 25 | medium impact / low risk | Feature-flag rollback for onion; skip B2-03 if schedule tight |
| Batch 3 | 20 | 30 | low impact / low–medium risk | Docs-only first (B3-01); CI smoke opt-in |

```text
Impact ↑
100 │              │
 85 │         B1   │
 50 │    B2        │
 25 │         B3   │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- No new architecture layers, no server-side undo history, no auth, no delta frame PATCH in this loop.
- Dependency direction and SyncCoordinator remain non-negotiable.
- Canvas Aug 5 Batch 1 (RAF + culling) treated as landed; only verify leftovers.
- Windows/macOS installers and signing stay on the **distribution** backlog, not this product loop.
- Batch 1 user outcome: close/quit and failed sync cannot silently discard Riley/Morgan work.

### Deferred

- Server-side command history / crash replay.
- Partial PATCH / dirty-rect sync.
- Offscreen bitmap cache (prior canvas Batch 3).
- Cross-platform signing and Tauri updater plugin.
- Cloud sync / accounts (anti-goal).

### Open questions

- Exact shell↔WebView quit IPC: Tauri event + JS `flushAllSync`, or HTTP-only shutdown endpoint?
- Should failed sync auto-retry or only surface + keep dirty?
- Is `BACKLOG.md` Windows checkbox stale relative to distribution refinement “B1 Complete”? Needs a reconcile pass outside this loop.

## Recommended next action

Implement **Batch 1** starting with **B1-01** (flush-path inventory against ARCHITECTURE sync table), then **B1-02** (failed PUT visibility) and **B1-03** (shell graceful quit) as a coordinated frontend + desktop deliverable. Success for the next loop: dirty project on shell quit either saves or warns; failed frame PUT leaves clear dirty/error state; matrix cases B1-04 green. Owner: frontend-led with desktop shell for B1-03. Hand to `skill-implementer` (or recursive-implementer if scoring gates needed) with skill `pixelanea-frontend-standards` plus desktop review for the quit path.
