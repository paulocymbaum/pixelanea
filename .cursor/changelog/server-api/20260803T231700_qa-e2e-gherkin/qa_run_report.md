# QA run — API modularization (Batch 3+4) integration

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Gherkin source** | `.cursor/changelog/server-api/20260803T231700_qa-e2e-gherkin/gherkin.md` |
| **Runner** | qa-gherkin-run |
| **Stack** | API `8787` · Vite `5173` · playwright + Catch2 |
| **Feature** | server-api |

## Summary

| Flag | Count |
|------|------:|
| 🔴 Red | 5 |
| 🟡 Yellow | 0 |
| 🟢 Green | 12 |
| ⚪ White | 3 |

| Functional | Count |
|------------|------:|
| Pass | 12 |
| Fail | 5 |
| Skip / N/A | 3 |

**Feature rollup:** yellow — handler wiring is sound (Catch2 + import E2E green); paint/race Playwright specs fail due to PUT-vs-PATCH spec drift, not handler regression.

## Prerequisites verified

- [x] `./scripts/dev.sh` / `e2e-webserver.sh` running
- [x] Health check `GET /api/health` OK
- [x] Frontend loads at `http://127.0.0.1:5173`
- [x] Catch2 `pixelanea_tests` — 67 cases, 582 assertions

## Scenario results

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @smoke | Paint and persist | Click-drag syncs via PUT | HP-001 | fail | 🔴 | `waitForFramePut` times out — editor now PATCHes cells |
| @smoke @routing | Multi-frame round-trip | Duplicate to 8 frames | HP-002, HP-011 | fail | 🔴 | Blocked by paint sync wait |
| @smoke @routing | Multi-frame round-trip | Save reload open | HP-003, HP-005 | fail | 🔴 | Blocked at first `waitForFramePut` |
| @smoke @slow | Import image | Wizard happy path | HP-004 | pass | 🟢 | Casey flow passes |
| @edge @api-only | Frame content negotiation | Default JSON GET | HP-005, HP-007 | pass | 🟢 | Catch2 JSON PUT/GET |
| @edge @api-only | Frame content negotiation | Binary GET + headers | HP-006, EDGE-002 | pass | 🟢 | Catch2 binary round-trip |
| @edge @api-only | Frame content negotiation | Accept q-values | EDGE-001 | pass | 🟢 | Catch2 q-value test |
| @edge | Import transparency | RGBA PNG index 0 | EDGE-004 | pass | 🟢 | `e2e/import.spec.ts` |
| @edge @api-only | PATCH cells | Batched changes | EDGE-003 | pass | 🟢 | Catch2 `[frame_delta]` |
| @edge @api-only | Binary PUT guards | Wrong byte count 400 | EDGE-005 | pass | 🟢 | Catch2 size rejection |
| @edge @api-only | Binary PUT guards | Idempotent updatedAt | EDGE-006 | pass | 🟢 | Catch2 repeat PUT |
| @race @sync | Frame sync | Undo during delayed PUT | RACE-001 | fail | 🔴 | PUT route mock; editor sends PATCH |
| @race @sync | Frame sync | Newer edit wins | RACE-002 | fail | 🔴 | Same PUT route-mock mismatch |
| @error @import | Import rejection | Unsupported file | ERR-001 | pass | 🟢 | Alert + disabled Continue |
| @error @api-only | Cell conflict | PATCH 409 | ERR-002 | pass | 🟢 | Catch2 conflict test |
| @smoke @manual-only | Export GIF | GIF89a download | HP-010 | skip | ⚪ | No Playwright spec yet |
| — | Frame operations | copy / reorder | HP-008, HP-009 | skip | ⚪ | unit-only |
| — | Frame not found | GET 404 | ERR-003 | skip | ⚪ | unit-only |

## Red flags (detail)

1. **HP-001 / HP-002 / HP-003** — Playwright `waitForFramePut` expects `PUT /frames/{n}` but `SyncCoordinator` now prefers `PATCH /frames/{n}/cells`. Not a handler regression.
2. **RACE-001 / RACE-002** — `e2e/race.spec.ts` intercepts PUT only; delta sync bypasses the mock.

## Escalations

| Item | Delegate to |
|------|-------------|
| E2E helpers out of sync with PATCH delta sync | `qa-e2e-gherkin` — update gherkin + `waitForFrameSync` helper |
| HP-010 GIF export uncovered | `qa-e2e-gherkin` — add `e2e/export.spec.ts` GIF scenario |

## References

- Gherkin: `.cursor/changelog/server-api/20260803T231700_qa-e2e-gherkin/gherkin.md`
- Playwright: 3 passed, 5 failed (CI mode)
- Catch2: 67/67 pass
