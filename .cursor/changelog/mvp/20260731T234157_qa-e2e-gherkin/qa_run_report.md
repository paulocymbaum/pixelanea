# QA run — Complete MVP

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-07-31T23:47:00Z |
| **Gherkin source** | `.cursor/changelog/mvp/20260731T234157_qa-e2e-gherkin/gherkin.md` |
| **Runner** | qa-gherkin-run |
| **Stack** | API `8787` · Vite `5173` · `vitest-qa` + API smoke + `pixelanea_tests` |
| **Feature** | `mvp` |

## Summary

| Flag | Count |
|------|------:|
| 🔴 Red | 4 |
| 🟡 Yellow | 12 |
| 🟢 Green | 48 |
| ⚪ White | 51 |

| Functional | Count |
|------------|------:|
| Pass | 115 |
| Fail | 4 |
| Skip / N/A | 51 |

**Feature rollup:** **red** (navigation guards on `@routing` + CI harness break)

## Prerequisites verified

- [x] `./scripts/dev.sh --kill-stale` running
- [x] Health check `GET /api/health` OK (`status: ok`, `version: 1.0.0`)
- [x] Frontend loads at `http://127.0.0.1:5173` (HTTP 200)
- [x] API fixtures: blank 32×32, 8-frame, `/tmp/e2e-qa-run.pixelanea` bundle

## Execution evidence

| Layer | Command | Result |
|-------|---------|--------|
| Web vitest | `pnpm --filter web test` | **257 passed**, 1 skipped, **1 suite failed** (`paintMatrix.test.ts` JSX in `.ts`) |
| QA harness | `paintMatrix.test.tsx` | **60 passed**, 1 skipped (`RACE-004`) |
| Backend | `./server/build/pixelanea_tests` | **46 cases**, 455 assertions, all pass |
| API smoke | Live `127.0.0.1:8787` | Health, create, PUT frame, duplicate, save, 404 frame, read-only save, 4K pixelate (0.50s), copy frame, GIF export |

## Scenario results (@smoke first)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @smoke | Riley walk cycle | Blank 32×32 animated through save and round-trip | MVP:HP-013, QA-004:HP-005 | partial | 🟡 | API save/open OK; browser reload + File Open not automated — bundle ctest + API PUT/GET confirm pixels |
| @smoke @routing | Casey import | Full wizard default BG removal | MVP:HP-002, QA-002:HP-001 | partial | 🟡 | ResolutionStep + FileDrop vitest pass; full wizard E2E not run in browser |
| @smoke @routing | Casey import | Resolution presets outline | MVP:HP-001, QA-002:HP-002 | pass | 🟢 | `ResolutionStep.test.tsx` |
| @smoke | Paint golden | Click-drag syncs to server | MVP:HP-003, QA-001:HP-001 | pass | 🟢 | `paintMatrix.test.tsx` + `syncCoordinator.test.ts` |
| @smoke | Paint golden | Post-import cleanup paint | QA-002:HP-007 | pass | 🟢 | Harness paint + undo |

## Scenario results (golden path & tools)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| — | New blank | Resolution presets | MVP:HP-001 | pass | 🟢 | `NewProjectPage.test.tsx` 16/32/64 |
| — | New blank | Custom canvas size | QA-002:EDGE-005 | pass | 🟢 | `CanvasSizeStep.test.tsx` |
| — | New blank | Animated import 8 frames | QA-002:EDGE-004 | skip | ⚪ | Import wizard E2E not run |
| — | Onboarding | Skip tour | QA-002:HP-006 | skip | ⚪ | Browser-only |
| — | Eraser | Click-drag clears | MVP:HP-004, QA-001:HP-002, HP-010 | pass | 🟢 | Harness + eraser label in `LeftToolRail` |
| — | Eraser | Empty cell no-op | QA-001:EDGE-003 | pass | 🟢 | Harness |
| — | Eraser | Drag skips transparent | QA-001:EDGE-022 | pass | 🟢 | Harness |
| — | Eyedropper | Sample then paint | MVP:HP-005, QA-001:HP-003 | pass | 🟢 | `eyedropperTool.test.ts` |
| — | Eyedropper | Sample transparent | QA-001:HP-014 | pass | 🟢 | Harness |
| — | Eyedropper | No undo on sample | QA-001:EDGE-021 | pass | 🟢 | Harness |
| — | Fill/line | Flood fill | QA-001:HP-004, HP-011 | pass | 🟢 | `fillTool.test.ts`, harness |
| — | Fill/line | Bresenham line | QA-001:HP-005, HP-016 | pass | 🟢 | `lineTool.test.ts`, `bresenham.test.ts` |
| — | Fill/line | Undo fill/line single step | QA-001:HP-017, HP-018 | pass | 🟢 | Harness |
| — | Fill/line | Line single click / clipped | QA-001:EDGE-012, EDGE-013 | pass | 🟢 | Harness |
| — | Palette | Add edit remove presets | MVP:HP-006 | pass | 🟢 | `editorStore.palette.test.ts` |
| — | Palette | Swatch click paint | QA-001:HP-015 | pass | 🟢 | Harness |
| — | Palette lock | Block off-palette | MVP:HP-007, QA-001:EDGE-001 | pass | 🟢 | `offPaletteCheck.test.ts` |
| — | Palette lock | Fill/line blocked | QA-001:EDGE-023, EDGE-024 | pass | 🟢 | Harness |
| — | Undo/redo | Keyboard + toolbar | MVP:HP-008, QA-001:HP-006, HP-012 | pass | 🟢 | `UndoRedoToolbar.test.tsx` |
| — | Undo/redo | Redo cleared after new edit | QA-001:EDGE-016 | pass | 🟢 | Harness |
| — | Shortcuts | Tool keys B E I G L | QA-001:HP-009 | pass | 🟢 | Harness |
| — | Shortcuts | Color keys 1–9 | QA-001:HP-007 | pass | 🟢 | Harness |
| — | Shortcuts | Blocked in path input | QA-001:EDGE-015 | skip | ⚪ | Browser focus E2E |
| — | Zoom | Grid at high zoom | QA-001:HP-008 | pass | 🟢 | Harness |
| — | Zoom | Extremes 25% / 3200% | MVP:EDGE-003 | skip | ⚪ | Browser canvas E2E |
| — | Multi-frame | Frame 2 isolation | QA-001:HP-013, QA-003:HP-004 | pass | 🟢 | Harness |
| — | Duplicate | To 8 copy art | MVP:HP-010, QA-003:HP-001 | pass | 🟢 | API duplicate 1→8 |
| — | Duplicate | To 16 and 32 | QA-003:HP-002 | skip | ⚪ | API not exercised for 16/32 in this pass |
| — | Duplicate | Blank other frames | QA-003:EDGE-002 | pass | 🟢 | API `fillMode: blank` frame 2 empty |
| — | Frame strip | Switch thumbnails | QA-003:HP-003, MVP:EDGE-005 | pass | 🟢 | `BottomFrameStrip.test.tsx` |
| — | Frame strip | Hidden at 1 frame | QA-003:EDGE-001 | pass | 🟢 | Progressive disclosure in strip test |
| — | Playback | Play pause read-only | MVP:HP-011, HP-012, QA-003:HP-005 | pass | 🟢 | `AnimationPlayer.test.tsx` |
| — | Playback | FPS slider | QA-003:HP-006 | pass | 🟢 | AnimationPlayer test |
| — | Playback | Loop off at end | QA-003:HP-007 | skip | ⚪ | Browser timing E2E |
| — | Playback | FPS boundaries | MVP:EDGE-004, ERR-008, QA-003:EDGE-004 | pass | 🟢 | Store clamp + player test |
| — | Playback | Identical frames | QA-003:EDGE-003 | pass | 🟢 | Player test |
| — | Playback | Undo disabled while playing | QA-001:EDGE-006, EDGE-017 | pass | 🟢 | Harness |
| — | Onion skin | Ghost prior frame | QA-003:HP-008 | pass | 🟢 | `renderer.test.ts` onion skin |
| — | Onion skin | Frame 0 no ghost | QA-003:EDGE-005 | skip | ⚪ | Visual E2E |
| — | Copy frame | Frame 1 → 4 | QA-003:HP-009 | pass | 🟢 | API copy frame 0→3 |
| — | Reorder | Drag frame 4 before 2 | QA-003:HP-010 | skip | ⚪ | DnD E2E not run |
| — | Save/open | First Save As | QA-004:HP-001 | partial | 🟡 | `ProjectPathDialog.test.tsx`; path dialog UX not full browser |
| — | Save/open | Save / Save As / Open | QA-004:HP-002–004 | partial | 🟡 | API bundle save OK; UI File menu not automated |
| — | Save/open | Minimal / unicode / migration | QA-004:EDGE-001–003 | partial | 🟢 | Backend ctest bundle round-trip |
| — | Asset type | Character persists | MVP:HP-015, QA-004:HP-006 | pass | 🟢 | ctest + `useProjectFileActions.test.tsx` |
| — | Export | PNG / spritesheet / GIF | MVP:HP-014, QA-004:HP-007–009 | partial | 🟡 | GIF API 200; PNG/spritesheet browser download not verified |
| — | Export | Off-palette warning | QA-004:EDGE-004 | pass | 🟢 | `OffPaletteExportDialog` + scan |
| — | Theme | Toggle persist | MVP:HP-017 | pass | 🟢 | `sessionStore.test.ts` |
| — | Shortcuts | `?` overlay | MVP:HP-018 | pass | 🟢 | `ShortcutsOverlay.test.tsx` |
| — | Color filters | Lighting blocks paint | QA-001:EDGE-020 | pass | 🟢 | Harness + `colorFilters.test.ts` |
| @offline | Offline | Core flows | MVP:HP-019, QA-001:ERR-001, ERR-006 | pass | 🟢 | Harness offline sync paths |

## Scenario results (@race)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @race | Palette lock | Toggle mid-drag | MVP:RACE-004 | pass | 🟡 | Harness guards; mid-drag toggle not integration-tested (matrix note) |
| @race @sync | Frame sync | Undo before PUT | QA-001:RACE-002 | pass | 🟡 | `syncCoordinator.test.ts`; `@flaky` without route delay in harness |
| @race @sync | Stale PUT | Newer edit wins | QA-001:RACE-007 | pass | 🟡 | Coordinator coalesce; no browser route mock |
| @race @sync | Rapid paint GET | MVP:HP-009 | pass | 🟢 | syncCoordinator debounce test |
| @race @sync | Frame switch before debounce | QA-001:RACE-012 | pass | 🟢 | Harness |
| @race | Paint timing | Tool switch, same cell, color keys, zoom, line interrupt, fill spam, undo spam | QA-001:RACE-001,003,008–011 | pass | 🟢 | Harness (except RACE-004) |
| @race | Paint timing | Navigate away mid-edit | QA-001:RACE-004 | skip | 🔴 | No unsaved confirm — `onNewProject` direct route change |
| @race | Import timing | Preset switch, back, accept+save, second drop | QA-002:RACE-001–004 | skip | ⚪ | No Playwright |
| @race | Animation timing | Switch during play, paint before load, play spam, reorder before PUT | QA-003:RACE-001–005 | skip | ⚪ | No Playwright |
| @race | Save timing | Save during sync, overwrite once, open after save | MVP:RACE-002, QA-004:RACE-001,003,004 | partial | 🟡 | API save during PUT plausible; UI races not run |
| @race | Duplicate rapid | MVP:RACE-003 | pass | 🟢 | API idempotent at 8 |
| @race | Duplicate during sync | QA-003:RACE-003 | skip | ⚪ | Harness partial |

## Scenario results (@routing)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @routing | Navigation guards | New project mid-edit | QA-001:RACE-004, QA-004:EDGE-005 | fail | 🔴 | Mistake #3 — File→New calls `onNewProject` with no `isDirty` check |
| @routing | Navigation guards | Open while unsaved | QA-004:RACE-002 | fail | 🔴 | `handleOpenRequest` loads without discard prompt |

## Scenario results (@edge)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @edge | Canvas boundaries | Corner cells outline | QA-001:EDGE-007, EDGE-019 | pass | 🟢 | Harness |
| @edge | Canvas boundaries | Same color, hover, right-click | QA-001:EDGE-002,008,009 | pass | 🟢 | Harness |
| @edge | Fill uniform / single palette | QA-001:EDGE-004, MVP:EDGE-001 | pass | 🟢 | Harness / store |
| @edge | Import tiny / transparency | QA-002:EDGE-001, EDGE-003 | skip | ⚪ | Browser wizard |
| @slow | 4K import perf | MVP:EDGE-007, QA-002:EDGE-002 | pass | 🟢 | API 3840×2160→64 in 0.50s |

## Scenario results (@error)

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @error | API failures | PUT 500, undo/redo offline, duplicate 500, frame 404 | QA-001:ERR-002–007, QA-003:ERR-001–002 | pass | 🟢 | Harness `SyncCoordinator` onError |
| @error | Import errors | Bad type, corrupt, pixelate 500, cancel picker | MVP:ERR-002, QA-002:ERR-001–004 | partial | 🟡 | `errors.importFileType` wired; corrupt/500 not run in browser |
| @error | Bundle/save | Corrupt ZIP, checksum, traversal, read-only, wrong type | MVP:ERR-003–007, QA-004:ERR-001–005 | partial | 🟢 | ctest + API read-only 4xx |
| @error | ENOSPC on save | QA-004:ERR-006 | skip | ⚪ | deferred — no ENOSPC sim |
| @error | No project paint guard | QA-001:ERR-003 | pass | 🟢 | Harness |

## Red flags (detail)

1. **Navigation guards missing** (`QA-001:RACE-004`, `QA-004:RACE-002`, `QA-004:EDGE-005`) — `useProjectFileActions.tsx` opens/new routes without checking `isDirty`. Gherkin expects confirm dialog; user can lose editor context silently (mistake #3). **Delegate: skill-implementer**.

2. **`paintMatrix.test.ts` suite fails to compile** — JSX in `.ts` file breaks full `pnpm --filter web test` (257 pass but suite exit 1). Duplicate of `.tsx` harness. **Delegate: skill-implementer**.

## Yellow flags (detail)

1. **No Playwright E2E** — 51 scenarios white/skipped; `@smoke` Riley/Casey paths only partially verified via vitest + API (mistake #10 partial — golden path automated, full journey not).

2. **QA-002–004 matrices not executed** — Import/animation/project-io matrix rows still `[ ]` in skill-outputs; this run inferred from component tests + API.

3. **@race scenarios pass in harness only** — Flake risk without `page.route` delays (`flag-rubric` yellow for RACE-002, RACE-007).

4. **Export download paths** — GIF API returns data; PNG/spritesheet file download not verified in browser (mistake #12 partial).

5. **Save As path dialog** — Technical path field (`/home/...`) on golden path (mistake #6 / #8 — Morgan/Casey friction).

6. **`paintMatrix.test.ts` duplicate** — CI noise until removed or renamed to `.tsx`.

## Green highlights

- **Paint matrix harness** — 60/61 QA-001 cases green in vitest (`RACE-004` intentionally skipped for E2E).
- **Sync coordinator** — Debounce, coalesce, offline reconnect (`MVP:HP-009`, ERR-006).
- **Backend bundle** — Pack/unpack, checksum, traversal rejection (46 ctest cases).
- **4K pixelate** — 0.50s on API (ship gate `MVP:EDGE-007`).
- **Animation player** — Read-only on play, FPS clamp 1–24, loop controls.
- **Plain-language API errors** — 404 frame index JSON `message` field.

## White / skipped

| Category | Count | Reason |
|----------|------:|--------|
| Unit-only matrix rows | 8 | MVP:HP-020, HP-022, EDGE-002, ERR-001, ERR-006; QA-001:EDGE-005, EDGE-010, EDGE-018 |
| Deferred fixtures | 2 | MVP:EDGE-006 ZIP noise; QA-004:ERR-006 ENOSPC |
| No Playwright / browser E2E | 39 | Wizard DnD, reload persistence UI, loop-off timing, onboarding visual |
| Harness-skipped by design | 1 | QA-001:RACE-004 (marked for Playwright) |

## UX mistakes spotted (ux-seamless-flows)

- [x] 3 Flow break — navigate away without unsaved guard
- [x] 6 Form friction — Save/Open path requires filesystem path string
- [x] 8 Jargon — path field expects `.pixelanea` absolute path (workshop friction)
- [x] 10 Happy path only — full browser E2E not implemented
- [ ] 1 Primary action unclear
- [ ] 2 Hidden state
- [ ] 4 Inconsistent patterns
- [ ] 5 Cognitive overload
- [ ] 7 Weak hierarchy
- [ ] 9 Accessibility (blocking)
- [ ] 11 Beauty without function
- [ ] 12 No feedback loop (save toast exists when save succeeds)

## Escalations

| Item | Delegate to |
|------|-------------|
| Unsaved guards on New / Open | `skill-implementer` |
| `paintMatrix.test.ts` compile failure / duplicate suite | `skill-implementer` |
| Implement Playwright `e2e/` from gherkin | `skill-implementer` or user |
| UX path-field friction on save/open | `uxui-design-critique` |
| QA-002–004 matrix formal pass | `test-matrix-unit` |

## References

- [flag-rubric.md](../../../skills/qa-gherkin-run/flag-rubric.md)
- [ux-seamless-flows](../../../skills/ux-seamless-flows/SKILL.md)
- Gherkin: `.cursor/changelog/mvp/20260731T234157_qa-e2e-gherkin/gherkin.md`
