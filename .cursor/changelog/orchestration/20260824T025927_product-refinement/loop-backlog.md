# Loop Backlog — Post-SWOT Quality & Platform Hardening

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-24 |
| **Feature area** | orchestration |
| **Trigger** | System-wide SWOT / code-review session (sync races, CI gaps, platform parity, canvas perf, contributor friction) |
| **Horizon** | Next 2–3 shippable batches (post-v1 hardening) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

A full-system SWOT and code review identified strong layer boundaries and SyncCoordinator design, but flagged that Playwright E2E (including `@race` sync specs) is manual-only while GitHub Actions runs `full` without E2E. Other gaps: crash-before-flush data loss (by design), thin server API test coverage relative to frontend, canvas performance ceiling on large grids, and Windows workshop parity still in BACKLOG. This refinement converts review findings into batched, scope-tagged work without breaking OpenAPI-first or local-first constraints.

## Dialogue summary

- **Jordan** argued Batch 1 must close the CI/E2E gap before any perf refactors — `e2e/race.spec.ts` already encodes RACE-002; not running it in CI is the highest regression risk with lowest architectural churn.
- **Sam** pushed for a user-visible Batch 1 outcome, not "CI only" — agreed: nightly or PR-optional E2E plus a facilitator-facing durability note (autosave window) satisfies Morgan/Riley trust without contract changes.
- **Jordan** deferred full delta-sync rollout until metrics prove full-frame PUT pain; Sam accepted Batch 2 for delta after Batch 1 green, with a spike gate on 128×128×32 frames.
- **Windows shell** stays Batch 3 — already in BACKLOG; Sam will not pull it ahead of quality gates that protect Linux workshop pilots on `main`.
- **Tension recorded:** crash-before-flush mitigation (periodic flush vs. warn-only) — Sam wanted softer UX nudge in Batch 1; Jordan scoped visible "unsaved to server" enhancement to Batch 2 to avoid autosave storms.

## Batched tasks

### Batch 1 — Must ship: CI confidence + facilitator trust

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Add Playwright `@smoke` + `@race` E2E job to GitHub Actions (nightly on `main` + optional `workflow_dispatch`; document PR opt-in) | both | SWOT finding: race regressions can ship while CI is green; `e2e/race.spec.ts` + `syncCoordinator.test.ts` exist but E2E not in `build.yml` | — |
| B1-02 | Extend `scripts/ci.sh` `e2e` profile notes in CONTRIBUTING + README: when maintainers must run locally vs CI | frontend | Reduces contributor false confidence; aligns with existing `e2e` profile definition | — |
| B1-03 | Add facilitator doc section: local threat model (127.0.0.1 API), autosave debounce window, crash-before-flush behavior | frontend | Morgan workshop trust; no code change; cites ARCHITECTURE undo/sync model | — |
| B1-04 | Skill-output smoke stays in `fast` profile — verify no regression when E2E job added | both | Harness CI must not slow hook-commit path | B1-01 |

### Batch 2 — Should ship: sync durability signals + backend test depth

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Status bar / connection UX: surface "syncing to server" vs "synced, not saved to file" more distinctly during debounce window | frontend | SWOT data-loss window; builds on existing `bundleDirty` + sync callbacks in `persist.ts` | B1-03 |
| B2-02 | Server API integration tests: save/open/import error paths (corrupt bundle, bad checksum, missing zenity graceful fallback) | backend | 14 Catch2 tests vs ~97 frontend tests; handlers untested at HTTP boundary | — |
| B2-03 | Frame delta sync spike: measure full-frame PUT vs delta on 64×64 and 128×128 grids; gate B2-04 on >30% payload reduction | both | `saveFrameDelta` exists in SyncCoordinator; avoid premature contract churn | B1-01 |
| B2-04 | Enable delta PUT on paint hot path when spike passes (keep full-frame on flush/save/export) | both | Bandwidth + server load at scale; layer boundary preserved via existing API | B2-03 |

### Batch 3 — Could ship: platform parity + canvas perf

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Windows Tauri shell + NSIS installer (BACKLOG active item) | both | Workshop parity; ADR 0001 cross-platform path; zenity gap on Windows | B1-01 |
| B3-02 | Canvas viewport perf batch: frame cache prefetch tuning, onion-skin draw budget, animation playback profiling harness | frontend | Product-direction perf audit; `frameCachePerf.test.ts` + `paintStrokePerf.test.ts` exist as guardrails | B2-04 |
| B3-03 | CLI exporter spike (`pixelanea export project.pixelanea --format png`) reusing `server/export` | backend | ARCHITECTURE extension point; Riley headless pipeline; no UI contract change | — |
| B3-04 | Deferred: Tauri-native file dialogs (ADR 0002) — revisit only after Windows shell lands | both | Contract churn risk; zenity works on Linux pilot | B3-01 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 2 | 2 | 4 |
| Batch 2 | 1 | 1 | 2 | 4 |
| Batch 3 | 2 | 1 | 1 | 4 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 (all contributors + Morgan pilots) | 2 | 85 | 1.0 | 1360 | 1 |
| Batch 2 | 1200 (Riley + Morgan active editors) | 1.5 | 75 | 2.5 | 540 | 2 |
| Batch 3 | 600 (Windows workshop + perf-sensitive Riley) | 2 | 60 | 4.0 | 180 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` with Confidence as decimal.

**RICE notes:**

- Batch 1 ranks first despite lower persona Impact because Reach includes every merge to `main` and Confidence is high — scripts and specs already exist.
- Sam would promote Batch 3 Windows (B3-01) above B3-02 perf if a signed Windows workshop is scheduled before Q4 — strategic pilot deadline overrides raw RICE for that sub-item only.
- Batch 2 RICE is conservative on Effort due to delta-sync unknowns (B2-03 spike may expand scope).

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 70 | 25 | high impact / low risk | Pin Playwright + stack versions in CI; cache browser; keep E2E off required PR path initially if flaky |
| Batch 2 | 65 | 55 | high impact / moderate risk | Spike before B2-04; HTTP tests use temp DB fixtures; no OpenAPI change in B2-01/B2-02 |
| Batch 3 | 75 | 70 | high impact / high risk | Windows: follow ADR 0001 estimate; perf: benchmark before/after; defer ADR 0002 dialog migration |

```text
Impact ↑
100 │           │ HI/HRI (B3) │
 75 │           │             │
 50 │           │ HI/LR (B2)  │
 25 │           │             │
  0 └───────────┴─────────────┴──→ Risk
    0          25    50    75  100
         HI/LR (B1) at ~(70, 25)
```

## Decisions & open questions

### Agreed

- Batch 1 is shippable without Batch 2; no OpenAPI changes in Batch 1.
- E2E in CI starts as nightly + documented manual gate, not blocking every PR (flakiness budget).
- Crash-before-flush stays architectural (no server command history in v1); UX clarity over silent recovery.
- Windows shell remains Batch 3 unless product sets a hard workshop date.
- Delta sync requires spike evidence before hot-path enablement.

### Deferred

- Cloud sync, accounts, flatpak/snap (BACKLOG deferred).
- Tauri-native file dialogs until Windows shell proves shell↔web bridge pattern (ADR 0002).
- Full command-history persistence / session recovery.
- graphify/agent-harness simplification (meta-tooling; not user-facing).

### Open questions

- Should E2E become required on PR after 2 weeks nightly green?
- Is 128×128 the workshop canvas cap, or do pilots need 256×256 perf guarantees?
- Code-signing budget for Windows SmartScreen — product decision before B3-01 release.

## Recommended next action

**Batches 1–3 shipped.** Monitor nightly `@smoke` + `@race` green streak on `main`; run full Playwright (`pnpm test:e2e --grep-invert 'LinkedIn|@perf'`) before major merges. Next product loops: Windows code signing (budget), Tauri-native file dialogs (B3-04), optional PR-required E2E after 2 weeks nightly green.
