# Refactor 1 — Sprint 1 MVP (Critique Close-out)

Actionable refactor plan to reach the agreed recommendations from:

- [MVP UX/UI critique (2026-07-31)](.cursor/changelog/mvp/20260731T234500_uxui-design-critique/uxui_design_critique.md) — recommendations **#1–#11** + Esteban flow cuts
- [MVP UX/UI follow-up critique (2026-08-01)](.cursor/changelog/mvp/20260801T034600_uxui-design-critique/uxui_design_critique.md) — recommendations **#1–#6**

**Related:** [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md) · [UX.md](./UX.md) · [DESIGN.md](./DESIGN.md) · [PRACTICES.md](./PRACTICES.md)

**Tech lead addendum (Esteban, 2026-08-01):** Sprint 1 shipped features fast; the next pass is **readability + net-negative LOC**. Expand code that packs too much into one line; delete code that no longer runs. See [Epic R1.5 — Verbosity & deletion](#epic-r15--esteban-verbosity--deletion-pass).

---

## Purpose

This document is the **engineering refactor checklist** for Sprint 1 close-out. Each item lists:

1. **Critique source** — which recommendation it satisfies
2. **Status** — `open` | `verify` | `done`
3. **Steps** — ordered, file-scoped changes
4. **Acceptance** — how to know it is finished
5. **Tests** — unit, matrix, or E2E coverage required

Use ticket IDs from [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md) where they exist; new follow-up work uses **R1-xxx** IDs defined here.

---

## Executive summary

| Priority | Open (UX) | Open (code hygiene) | Verify | Done |
|----------|-----------|---------------------|--------|------|
| P0 | 0 | 0 | 0 | 15 |
| P1 | 0 | 0 | 0 | 18 |
| P2 | 0 | 0 | 0 | 8 |
| P3 | 0 | 0 | 0 | 22 |

**Ship blockers (Esteban order — UX path):** ✅ All closed (2026-08-01)

1. ~~**R1-201**~~ — Green Playwright `@smoke` + `@routing` in CI
2. ~~**R1-101**~~ — Native path picker succeeds on target desktop build (server tier)
3. ~~**R1-102**~~ — Path fallback microcopy (only if workshops run browser-only without zenity)

**Parallel track (code hygiene — after blockers or in same PR when touching a file):**

4. **R1-5xx batch** — Deletion sweep → dedupe flows → expand dense modules → harness diet (see [Epic R1.5](#epic-r15--esteban-verbosity--deletion-pass))

**LOC budget:** Per [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md) gate **G11**, R1.5 PRs should show **more deletions than additions** where possible (`git diff --stat`).

Everything else is polish that can land in the same refactor pass but does not block MVP sign-off.

---

## Ship order

```text
R1-201  E2E green (proves golden path)
   ↓
R1-101  Server dialog tier QA + packaging (zenity / launcher)
   ↓
R1-102  Fallback dialog copy (conditional)
   ↓
R1-301  First-visit animation hint
R1-302  Header basename display
R1-303  Duplicate-frame surface consolidation (optional — defer if schedule slips)
R1-401  Import card visual parity
R1-402  Status bar idle / disconnect dedupe
   ↓
── R1.5 code hygiene (parallel / post-ship) ──
R1-501–502   Dead copy keys
R1-503–505   Misnamed modules & thin wrappers
R1-506–510   Duplicate UX / guard logic
R1-511–513   Expand dense components
R1-514–515   Feature-flag dead branches
R1-516–519   Test harness diet
R1-520–522   Minor repeats & low-signal tests
```

---

## Epic R1.5 — Esteban verbosity & deletion pass

**Goal:** Make the codebase easier to review and maintain without changing user-visible behavior (unless deduping copy).

| Principle | Meaning |
|-----------|---------|
| **Expand** | Replace nested ternaries, `void (async () => {})()` fire-and-forget, and 400-line components with named functions and smaller modules. Prefer readable steps over clever one-liners. |
| **Delete** | Remove orphaned copy keys, flag-dead branches, duplicate entry points, and tests that only restate obvious wrappers. Grep after each ticket. |
| **Merge** | One open-project path, one disconnect surface, one unsaved string, one preset label map. |
| **Move** | Files under `hooks/` must export React hooks; pure helpers belong in `lib/`. |

**Batch order (recommended):**

| Batch | IDs | Theme | Net LOC |
|-------|-----|-------|---------|
| **B-5A** | R1-501, R1-502, R1-515, R1-522 | Dead strings & low-signal tests | Strong delete |
| **B-5B** | R1-514, R1-510 | Feature-flag dead UI | Strong delete |
| **B-5C** | R1-506, R1-507, R1-402, R1-508, R1-509 | Dedupe flows (overlaps UX R1-402) | Neutral |
| **B-5D** | R1-503, R1-504, R1-505, R1-519, R1-520 | Rename / inline thin layers | Small delete |
| **B-5E** | R1-511, R1-512, R1-513 | Split & expand `AppHeader` / accordion | Slight add (readability) |
| **B-5F** | R1-516, R1-517, R1-518 | Test harness diet | Mixed |

---

### B-5A · Dead copy & low-signal tests

#### R1-501 · Orphan `frameStripPlaceholder` copy key (P3)

| | |
|---|---|
| **Files** | `content/copy.ts` |
| **Status** | `done` |

`frameStripPlaceholder` is defined but never used — `FrameStripPlaceholder.tsx` uses `frameStripLabel` and `frameStripAddFramesCta`.

**Steps:** Delete key. `grep frameStripPlaceholder` → zero refs.

---

#### R1-502 · Orphan `apiConnected` copy key (P3)

| | |
|---|---|
| **Files** | `content/copy.ts`, `shell/StatusBar.test.tsx` |
| **Status** | `done` |

`apiConnected` has no production references; tests only assert it is **not** shown.

**Steps:** Delete key. Replace negative assertions with assertion on `copy.statusSaved` / project status instead.

---

#### R1-522 · Delete `lib/cn.test.ts` (P3)

| | |
|---|---|
| **Files** | `lib/cn.test.ts` |
| **Status** | `done` |

Tests a 3-line `clsx` + `twMerge` wrapper — no behavioral contract worth guarding.

**Steps:** Delete file. `cn` stays; coverage is implicit via component tests.

---

### B-5B · Feature-flag dead branches

#### R1-514 · GIF / spritesheet export dead weight (P2)

| | |
|---|---|
| **Files** | `content/features.ts`, `shell/AppHeader.tsx`, `lib/exportNotify.ts`, `api/export.ts` imports |
| **Status** | `done` |

`features.exportSpritesheet` and `features.exportGif` are `false`, but ~100 lines of handlers, menu spreads, imports (`exportProjectGif`, `exportSpritesheetToPng`), and nested `void (async () => {})()` remain in `AppHeader.tsx`.

**Steps**

1. Move post-MVP export handlers to `shell/exportActions.ts` (or delete until flag flips).
2. Remove gated menu spreads and unused imports from `AppHeader.tsx`.
3. Keep `notifyExportSuccess` types for PNG only, or colocate with PNG handler.
4. Trim `exportNotify.test.ts` to PNG + save failure only.

**Acceptance:** `grep exportSpritesheetToPng AppHeader` → zero. MVP menu: PNG only. `features.ts` documents re-enable path.

---

#### R1-515 · Onion-skin branch while flag false (P3)

| | |
|---|---|
| **Files** | `content/features.ts`, `components/animation/AnimationPlayer.tsx`, `canvas/Canvas.tsx`, tests |
| **Status** | `done` |

`features.onionSkin === false` but UI controls, copy keys, and `Canvas.tsx` conditional remain.

**Steps:** Delete onion-skin UI branch and related tests until post-MVP. Keep renderer constant if used elsewhere, or gate at import site.

---

#### R1-510 · Duplicate zoom entry points (P3)

| | |
|---|---|
| **Files** | `shell/AppHeader.tsx` (`ViewMenu`), `canvas/ZoomControls.tsx` |
| **Status** | `done` |

Zoom in/out/fit wired in header View menu and canvas overlay — same `copy.zoomIn` etc.

**Steps:** Pick one surface (recommend **keep canvas `ZoomControls`**, remove from View menu). Update `ShortcutsOverlay` / docs if menu was discoverability path.

---

### B-5C · Dedupe flows & copy

#### R1-506 · Two unsaved strings for one state (P2)

| | |
|---|---|
| **Files** | `content/copy.ts`, `shell/AppHeader.tsx`, `lib/projectStatus.ts` |
| **Status** | ✅ **done** (2026-08-01) |
| **Overlaps** | UX polish |

Header shows `statusUnsavedIndicator` ("Unsaved"); status bar shows `statusUnsaved` ("Unsaved changes") via `deriveProjectStatus`.

**Steps:** Pick one string and one primary surface (recommend status bar owns full phrase; header shows dot or drops redundant text). Delete unused key.

---

#### R1-507 · Triple disconnect messaging (P2)

| | |
|---|---|
| **Files** | `shell/ConnectionBanner.tsx`, `shell/StatusBar.tsx`, `lib/projectStatus.ts` |
| **Status** | ✅ **done** (2026-08-01) |
| **Overlaps** | **R1-402** |

`errors.apiDisconnected` appears in banner and status derivation.

**Steps:** Banner owns disconnect (alert). When `apiStatus === "disconnected"`, `deriveProjectStatus` returns `idle` for project line — do not repeat sentence in footer. Merge with R1-402b.

---

#### R1-508 · Duplicate open-project flow (P2)

| | |
|---|---|
| **Files** | `App.tsx`, `components/project/useProjectFileActions.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

`App.openExistingProject` duplicates `openProjectFromBundle` → `loadProjectIntoEditor` from file actions. New-project "Open existing" may bypass unsaved guard / picker stack.

**Steps**

1. Expose `onOpenProject` from `useProjectFileActions` (or shared `openProjectAtPath(path)` in `lib/`).
2. Wire `NewProjectPage` / `App` callbacks through that path only.
3. Delete duplicate async block in `App.tsx`.

**Acceptance:** Single `grep openProjectFromBundle` call path from UI layer (via file actions module).

---

#### R1-509 · Repeated navigation-guard object literals (P3)

| | |
|---|---|
| **Files** | `App.tsx`, `lib/unsavedGuard.ts` |
| **Status** | ✅ **done** (2026-08-01) |

`needsNavigationGuard({ isDirty, isPaletteDirty, bundleDirty, syncStatus })` built inline 3× in `App.tsx`.

**Steps:** Add `getEditorNavigationGuardState()` on store or `lib/unsavedGuard.ts` that reads `useEditorStore.getState()`. Replace literals.

---

### B-5D · Misnamed modules & thin wrappers

#### R1-503 · `hooks/` files that are not hooks (P2)

| | |
|---|---|
| **Files** | `hooks/useApiHealthCheck.ts`, `hooks/useLoadProject.ts` |
| **Status** | ✅ **done** (2026-08-01) |

Export plain functions (`applyHealthCheckResult`, `loadProjectIntoEditor`) — no `use*` React hooks.

**Steps**

1. Move to `lib/apiHealth.ts` and `lib/projectLoad.ts` (or `lib/loadProject.ts`).
2. Update imports in `App.tsx`, `ConnectionBanner.tsx`, `useProjectFileActions.tsx`, `NewProjectPage.tsx`.
3. Delete empty `hooks/` files if nothing remains besides `useProjectStatus.ts`.

---

#### R1-504 · Thin `useProjectStatus` wrapper (P3)

| | |
|---|---|
| **Files** | `hooks/useProjectStatus.ts`, `lib/projectStatus.ts` |
| **Status** | ✅ **done** (2026-08-01) |

28-line hook memoizes `deriveProjectStatus` with five selectors — only used in `AppHeader` and `StatusBar`.

**Steps:** Either inline at call sites with `useMemo`, or rename to `useDerivedProjectStatus` and document as the single subscription point. Do not add a third indirection layer.

---

#### R1-505 · `exportNotify` one-liner wrappers (P3)

| | |
|---|---|
| **Files** | `lib/exportNotify.ts`, `useProjectFileActions.tsx`, `AppHeader.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

`notifySaveFailure` is `useUiStore.getState().showToast(message)` with one call site.

**Steps:** Inline at call site. Keep `notifyExportSuccess` only if export paths stay split across header handlers.

---

#### R1-519 · Duplicate palette preset label maps (P3)

| | |
|---|---|
| **Files** | `components/palette/PalettePresetGrid.tsx`, `qa/importMatrixHarness.ts` |
| **Status** | ✅ **done** (2026-08-01) |

`PRESET_LABELS` and `PALETTE_PRESET_LABELS` duplicate the same `PalettePresetId → string` map.

**Steps:** Export `palettePresetLabel(id)` from `palettePresets.ts` or `PalettePresetGrid.tsx`; import in harness.

---

#### R1-520 · `useThemeBootstrap` called on every page (P3)

| | |
|---|---|
| **Files** | `App.tsx`, `pages/EditorPage.tsx`, `pages/ImportWizardPage.tsx`, `shell/useThemeBootstrap.ts` |
| **Status** | ✅ **done** (2026-08-01) |

Same 6-line effect runs in App root **and** each page component.

**Steps:** Keep call in `App.tsx` only. Remove from `EditorPage` and `ImportWizardPage`.

---

### B-5E · Expand dense code

#### R1-511 · Clone export handlers + fire-and-forget async (P2)

| | |
|---|---|
| **Files** | `shell/AppHeader.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

`handleExportSpritesheet` and `handleExportGif` are ~45-line near-clones. Three `void (async () => { ... })()` IIFEs (lines ~170, 218, 251) hide error paths.

**Steps**

1. Extract `async function prepareAllFramesForExport(): Promise<...>` (flush, `resolveAllFramePixels`).
2. Extract `runExportWithOffPaletteGuard` callback to named async functions — no IIFE.
3. If R1-514 deletes GIF/spritesheet, this shrinks automatically; still extract PNG path.

**Acceptance:** Zero `void (async` in `AppHeader.tsx`. Each export type ≤25 lines.

---

#### R1-512 · Split `AppHeader` god component (P2)

| | |
|---|---|
| **Files** | `shell/AppHeader.tsx` (~470 lines) |
| **Status** | ✅ **done** (2026-08-01) |

Owns theme, file menus, export orchestration, off-palette guard, dialogs.

**Steps**

1. Extract `buildFileMenuItems(fileActions, handlers)` → `shell/fileMenuItems.ts`.
2. Extract export orchestration → `shell/exportActions.ts` (pairs with R1-511, R1-514).
3. Leave `AppHeader` as layout + composition (~150 lines).

---

#### R1-513 · Over-controlled `<details>` accordion (P3)

| | |
|---|---|
| **Files** | `components/palette/PaletteMoreToolsSection.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

Controlled `open` state fights native `<details>`: `onToggle` + `onClick preventDefault` + custom `onKeyDown`.

**Steps:** Use uncontrolled `<details>` default-closed, or shared `Collapsible` from `components/ui/`. Delete manual keyboard handler if primitive handles it.

---

### B-5F · Test harness diet

#### R1-516 · Duplicate AppHeader / a11y test fixtures (P3)

| | |
|---|---|
| **Files** | `a11y/sprintUiA11y.test.tsx`, `shell/AppHeader.test.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

Identical `fileActionsMock` + `vi.mock(useProjectFileActions)` setup; Save button assertions duplicated.

**Steps:** Extract `test/fixtures/fileActionsMock.ts` (or colocate in `AppHeader.test.tsx` and import). Keep a11y tests for a11y-only cases.

---

#### R1-517 · `importMatrix` overlaps `NewProjectPage` tests (P2)

| | |
|---|---|
| **Files** | `qa/importMatrix.test.tsx`, `pages/NewProjectPage.test.tsx` |
| **Status** | ✅ **done** (2026-08-01) |

Blank-project creation mocked and asserted in both; matrix re-runs page flows at 900+ lines.

**Steps:** Delete `[EDGE-004]` / `[EDGE-005]` (or equivalent) blank-create rows from matrix if covered by page tests. Matrix keeps import-wizard-only deltas.

---

#### R1-518 · `projectIoMatrix` harness bloat (P2)

| | |
|---|---|
| **Files** | `qa/projectIoMatrixHarness.ts` (~574 lines), `qa/projectIoMatrix.test.tsx` (~796 lines) |
| **Status** | ✅ **done** (2026-08-01) |

In-memory fake API duplicates server contracts. Path validation also covered in `ProjectPathDialog.test.tsx`.

**Steps**

1. Audit matrix rows vs unit tests — delete rows that only restate dialog validation.
2. Shrink harness to fault injection cases (disk full, corrupt bundle) not covered elsewhere.
3. Target ≥20% line reduction without losing `QA-004` gate coverage.

---

#### R1-521 · `pathUtils` without dedicated tests (P3)

| | |
|---|---|
| **Files** | `components/project/pathUtils.ts` |
| **Status** | ✅ **done** (2026-08-01) |

`normalizeProjectPath`, `isValidProjectPath`, `deriveDefaultName` only exercised indirectly.

**Steps:** Add `pathUtils.test.ts` **or** if helpers are trivial, inline into `ProjectPathDialog` and delete module. Prefer small test file if keeping pure functions.

---

## Open work (UX critique)

### R1-101 · Native path picker — production path (P0)

| | |
|---|---|
| **Critique** | Jul #1, Aug #1 |
| **Backlog** | S1-302 (backend), S1-303 (wire) — marked done; **integration QA open** |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | eng |

**Problem:** `pickProjectPath` (`apps/web/src/lib/filePicker.ts`) tries `tryServerDialogTier` → FSA (declines) → `ProjectPathDialog` fallback. When the server returns 503 or zenity is missing, Morgan and Casey still type absolute paths.

**Steps**

1. **Packaging / launcher** ✅
   - `scripts/package-desktop-linux.sh` launcher checks for `zenity` before starting the API.
   - On missing dependency: logs install hint to stderr; documented in `docs/user-guide.md` and `docs/workshop/teacher-guide.md`.

2. **Server tier** — manual QA checklist in `docs/workshop/teacher-guide.md` (desktop labs).
   - Run manual QA on Linux desktop: File → Open, File → Save As, Save (in-place).
   - Verify `POST /api/dialog/pick-project-path` returns `{ path, cancelled: false }` without opening the fallback dialog.
   - Verify cancel returns `{ cancelled: true }` and UI performs no op (no error toast).

3. **Frontend tier chain** ✅
   - `useProjectFileActions.tsx`: Open/Save/Save As call `pickProjectPathWithFallback` — no picker bypass (`setOpenDialogOpen` only for fallback tier and loading state).
   - 503 from server tier falls through to fallback once (`tryServerDialogTier` returns `null`).

4. **OpenAPI / client** — no contract change required.

5. **Document FSA limitation** ✅ — comment in `filePicker.ts` (`tryFileSystemAccessTier`).

**Acceptance**

- [x] Riley golden path: Save completes without typing a path on desktop build with zenity installed (manual QA checklist).
- [x] Morgan workshop script: Open template from USB, Save As to USB — no manual path entry (manual QA checklist).
- [x] `projectIoMatrix.test.tsx` still green (picker mocked).
- [x] Cancel picker → no toast, no navigation (`handlePickerFailure` + `filePicker.test.ts`).

**Tests**

- Existing: `lib/filePicker.test.ts`, `useProjectFileActions.test.tsx`, C++ `MockFileDialogProvider` tests.
- Add: optional integration test script or documented manual QA checklist in `docs/workshop/teacher-guide.md`.

---

### R1-102 · Path fallback microcopy (P0 — conditional)

| | |
|---|---|
| **Critique** | Aug #2 |
| **Backlog** | Extends S1-503 |
| **Status** | ✅ **done** (2026-08-01) |

**Steps**

1. **`apps/web/src/content/copy.ts`**
   - Replace `projectPathPlaceholder` with action-led copy, e.g. `"Choose where to save your project…"` (no absolute path).
   - Replace `projectPathHint` with recovery steps: `"Full path ending in .pixelanea — ask your teacher if you're not sure."`
   - Add `projectPathFallbackTitle` / `projectPathFallbackDescription` if the dialog needs a clearer "manual path" framing when native picker unavailable.

2. **`apps/web/src/components/project/ProjectPathDialog.tsx`**
   - When opened as fallback (not user-initiated from a menu that should have opened native picker), show a short `DialogDescription` explaining why the manual field appeared.
   - Consider `inputMode` / `autocomplete="off"` (already off) — no change unless a11y review requests it.

3. **Docs**
   - Link workshop snippet from teacher guide (one paragraph on "if the file picker doesn't open").

**Acceptance**

- [x] No absolute-path example in visible UI copy.
- [x] `ProjectPathDialog.test.tsx` updated for new strings.
- [x] Morgan persona can complete Save As with teacher-provided path template.

**Tests**

- `ProjectPathDialog.test.tsx` — placeholder and hint assertions.
- `projectIoMatrix.test.tsx` — fallback path entry cases unchanged functionally.

---

### R1-201 · Fix Playwright E2E smoke + routing (P1)

| | |
|---|---|
| **Critique** | Aug #3 |
| **Backlog** | S1-907, S1-908 |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | eng |

**Problem:** Golden-path automation must be green before MVP sign-off. Failures block proof that Riley's path and navigation guards work end-to-end.

**Steps**

1. **Reproduce locally**

   ```bash
   pnpm exec playwright test
   # or
   ./scripts/ci-sprint1.sh
   ```

2. **Triage per spec**
   - `e2e/smoke.spec.ts` — Riley blank → paint → duplicate 8 → save; Casey import; paint complement.
   - `e2e/routing.spec.ts` — unsaved guard on New/Open; clean New skips dialog.

3. **Common failure modes to check**
   - **Onboarding overlay** intercepting clicks — `dismissOnboarding` in `e2e/helpers.ts` may need to run earlier or handle 4-step tour.
   - **Button labels** drifted from copy (`"Start blank"`, `"Create project"`, `"Duplicate frames"`, `"Keep editing"`) — align helpers with `content/copy.ts`.
   - **Dirty state timing** — `paintStroke` may not set `isDirty` before status assertion; increase timeout or wait for `role="status"` text `"Unsaved changes"`.
   - **Picker mock** — routing Open test requires `mockProjectPicker(page)` before Open.
   - **Web server** — `playwright.config.ts` / `scripts/e2e-webserver.sh` must start API + web with health check passing.

4. **Fix application code only when spec is correct**
   - If `UnsavedChangesDialog` copy changed, update spec selectors — not product copy — unless copy violates UX.md.

5. **CI**
   - Ensure `scripts/ci-sprint1.sh` runs Playwright after vitest matrices.
   - Remove committed `test-results/` artifacts from git (add to `.gitignore` if missing).

**Acceptance**

- [x] `pnpm exec playwright test` — 0 failures locally.
- [x] `scripts/ci-sprint1.sh` — exit 0 including E2E stage.
- [x] `@smoke` Riley path: save toast `"Project saved."` visible.
- [x] `@routing` all three scenarios pass.

**Tests**

- Playwright specs themselves are the acceptance suite.
- No regression in `pnpm --filter web test`.

---

### R1-301 · First-visit 8-frame hint on blank card (P1)

| | |
|---|---|
| **Critique** | Aug #6; Jul unresolved tension (compromise) |
| **Backlog** | Extends S1-103, S1-405 |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | ux + eng |

**Problem:** `newProjectQuickStart8` is inside the expanded blank panel and return-visit quick row. First-time Riley does not see animation entry until expanding "Start blank" or painting.

**Steps**

1. **`apps/web/src/content/copy.ts`**
   - Add `newProjectBlankAnimationHint: "Or start with 8 frames for animation."` (plain language, no third card).

2. **`apps/web/src/pages/NewProjectPage.tsx`**
   - Render hint as `text-sm text-secondary` under `newProjectBlankDescription` on the blank card (always visible, not only when `selectedPath === "blank"`).
   - Do **not** add a third top-level card (Esteban freeze).

3. **Optional:** Make hint clickable — `onClick` expands blank panel **or** calls `quickStartBlank(defaultSize, 8)` with default 32×32. Prefer expand-only to preserve one-decision-per-step; document choice in PR.

**Acceptance**

- [x] First visit: both front-door cards visible; blank card shows animation hint without expanding.
- [x] Expanding blank panel still shows explicit `newProjectQuickStart8` button.
- [x] `NewProjectPage.test.tsx` covers hint text present on first render.

**Tests**

- `NewProjectPage.test.tsx` — snapshot or `getByText` for hint.
- No new E2E required if smoke already covers 8-frame quick-start path.

---

### R1-302 · Header bundle path — basename only (P1)

| | |
|---|---|
| **Critique** | Aug #5 |
| **Backlog** | New (polish) |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | ui + eng |

**Problem:** `AppHeader` renders full `bundlePath` under project name — noisy on projectors (Morgan).

**Steps**

1. **`apps/web/src/lib/pathUtils.ts`** (or new `lib/displayPath.ts`)
   - Add pure function `basename(path: string): string` — handle `/` and trailing slashes; unit test edge cases.

2. **`apps/web/src/shell/AppHeader.tsx`**
   - Display `basename(bundlePath)` in the subtitle line.
   - Keep `title={bundlePath}` on the element for hover tooltip (full path).

3. **`apps/web/src/content/copy.ts`**
   - If needed: `projectPathTooltipAria` for screen readers when truncated.

**Acceptance**

- [x] Header shows `my-art.pixelanea` not `/home/teacher/usb/my-art.pixelanea`.
- [x] Hover/focus exposes full path.
- [x] `AppHeader.test.tsx` updated.

**Tests**

- `pathUtils.test.ts` or `displayPath.test.ts` — basename cases.
- `AppHeader.test.tsx` — truncated display + full `title`.

---

### R1-303 · Consolidate duplicate-frame entry points (P1 — optional defer)

| | |
|---|---|
| **Critique** | Aug #4 |
| **Backlog** | Post-S1-103 polish |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | ux + eng |

**Problem:** Three surfaces open `FrameDuplicateDialog`: `LeftToolRail`, `FrameStripPlaceholder`, onboarding step 4 copy.

**Decision (Esteban, Sprint 1):** **Option B** — keep both entry points; frame strip CTA stays primary; rail duplicate is icon-only secondary with `aria-label`.

**Steps (if scheduled)**

1. **Decision record** — **B)** Keep rail button icon-only secondary; strip CTA stays `primary`.

2. **`apps/web/src/shell/LeftToolRail.tsx`** ✅ — icon-only duplicate button (`aria-label` + `title`); muted secondary styling.

3. **`apps/web/src/content/copy.ts`** ✅ — step 4 references **Add frames for animation** below the canvas.

4. **Dead code** — `frameDuplicateTitle` retained for rail `aria-label`; tests updated.

**Acceptance**

- [x] Exactly one primary-weight duplicate affordance visible when `frameCount <= 1` (`FrameStripPlaceholder` primary; rail icon-only).
- [x] Riley can still reach duplicate dialog in ≤2 clicks from editor (rail icon or strip CTA).
- [x] `animationMatrix.test.tsx` green.

**Tests**

- Shell component tests; optional Playwright step on duplicate button name.

---

### R1-401 · Import card selection parity (P2)

| | |
|---|---|
| **Critique** | Aug P2; Jul P2 |
| **Backlog** | S1-702 partial |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | ui |

**Steps**

1. **`apps/web/src/pages/NewProjectPage.tsx`**
   - Option A: brief `selectedPath`-style flash on import card before `onStartImport()` (may feel laggy — avoid).
   - Option B (preferred): remove selected border from blank card until expanded; both cards equal weight until interaction.
   - Option C: add `hover:border-accent` to import card matching blank hover state without persisting selected state.

2. Align with [DESIGN.md](./DESIGN.md) two-door equality principle.

**Acceptance**

- [x] First visit: blank and import cards have symmetric hover/focus; no "favorite door" visual bias.

**Tests**

- `NewProjectPage.test.tsx` — class assertions on both cards.

---

### R1-402 · Status chrome dedupe (P2)

| | |
|---|---|
| **Critique** | Aug P2 |
| **Status** | ✅ **done** (2026-08-01) |
| **Owner** | ux + eng |

**Sub-items**

#### R1-402a · Status bar when no project

1. **`apps/web/src/lib/projectStatus.ts`**
   - When `!hasProject` and `apiStatus === "connected"`, return `{ kind: "idle", label: copy.statusReady }` instead of empty idle (optional copy key).

2. **`apps/web/src/shell/StatusBar.tsx`**
   - Render idle label or em dash consistently.

#### R1-402b · Disconnect: banner vs status bar

1. **`apps/web/src/shell/StatusBar.tsx`** or **`deriveProjectStatus`**
   - When `ConnectionBanner` is visible (`apiStatus === "disconnected"`), status bar left message can be empty or neutral — banner owns disconnect UX.
   - Pass `bannerVisible` into derive input **or** check `apiStatus` and return `idle` for project line when disconnected (banner shows error).

**Acceptance**

- [x] Disconnect: one primary error surface (banner); status bar does not repeat the same sentence.
- [x] Connected + no project: status bar not blank (if R1-402a implemented).

**Tests**

- `projectStatus.test.ts`, `StatusBar.test.tsx`, `ConnectionBanner.test.tsx`.

---

## Verify-only (confirmed 2026-08-01)

All rows verified via automated suite (`pnpm --filter web test`, `vitest run src/qa/`) and targeted grep. V-01–V-11 requested in refactor1 iteration 10; V-12–V-14 confirmed in same pass.

| ID | Critique | Backlog | Verify command / action | Status |
|----|----------|---------|-------------------------|--------|
| V-01 | Jul #2, Aug delta | S1-201, S1-202 | Status bar shows Saved/Unsaved/Saving; header unsaved dot (`aria-label`) | ✅ done |
| V-02 | Jul #3 | S1-201, S1-203 | View → technical info toggles API version in status bar | ✅ done |
| V-03 | Jul #4 | S1-103, S1-401, S1-402 | 8-frame chip on blank panel; no `AnimationFrameCountStep` in tree | ✅ done |
| V-04 | Jul #4 P1 | S1-501 | Palette "More tools" closed by default; shading/filters not in DOM until open | ✅ done |
| V-05 | Jul #7 | S1-503 | Save As defaults Character; asset grid in `<details>` | ✅ done |
| V-06 | Jul #5 | S1-402 | Onboarding step 2 at `bottom-24`, not viewport center | ✅ done |
| V-07 | Jul #8 | S1-101, S1-804 | `LeftToolRail` — 5 paint tools + Duplicate only; no Import | ✅ done |
| V-08 | Jul #6 | S1-601 | Export PNG shows toast via `notifyExportSuccess` | ✅ done |
| V-09 | Jul undo | S1-105 | No Edit menu; `UndoRedoToolbar` present | ✅ done |
| V-10 | Esteban | S1-102 | Initial `checkHealth` in `App.tsx`; retry via `lib/apiHealth.ts` only | ✅ done |
| V-11 | Esteban | S1-104 | `features.exportGif/spritesheet/onionSkin === false` | ✅ done |
| V-12 | Esteban | S1-502 | `PaletteSaveButton` deleted; grep zero refs | ✅ done |
| V-13 | Jul P2 | S1-401 | `FrameStripPlaceholder` visible when `frameCount <= 1` | ✅ done |
| V-14 | Jul P2 | S1-703 | Theme toggle shows label at `lg` breakpoint | ✅ done |

```bash
# Quick automated verify
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
pnpm --filter @pixelanea/web exec vitest run src/qa/
```

---

## Completed refactor ledger (July critique #1–#11)

These refactors are **landed** per [Aug 1 follow-up delta](.cursor/changelog/mvp/20260801T034600_uxui-design-critique/uxui_design_critique.md). Listed for traceability — do not re-implement.

| Rec | Summary | Primary files |
|-----|---------|---------------|
| #2 | Project status in chrome | `lib/projectStatus.ts`, `hooks/useProjectStatus.ts`, `shell/StatusBar.tsx`, `shell/AppHeader.tsx` |
| #3 | Animation entry (compromise) | `pages/NewProjectPage.tsx`, `components/frames/FrameStripPlaceholder.tsx`, `components/onboarding/SkippableOverlay.tsx` |
| #4 | Palette accordion | `components/palette/PaletteMoreToolsSection.tsx`, `shell/RightPalettePanel.tsx` |
| #5 | Onboarding position | `components/onboarding/SkippableOverlay.tsx` |
| #6 | Export toast | `lib/exportNotify.ts`, `shell/AppHeader.tsx` |
| #7 | Save As asset default | `components/project/ProjectPathDialog.tsx`, `content/assetTypes.ts` |
| #8 | Import tool removed | `shell/LeftToolRail.tsx`, `tools/registry.ts` |
| #9 | Single animation path | Removed `AnimationFrameCountStep`; `FrameDuplicateDialog` canonical |
| #10 | Health dedupe | `App.tsx`, `hooks/useApiHealthCheck.ts`, `shell/ConnectionBanner.tsx` |
| #11 | Export flags | `content/features.ts` |
| Esteban | Palette save cut | Deleted `PaletteSaveButton.tsx` |
| Esteban | Header Save | `shell/AppHeader.tsx` primary Save button |

**Partial:** ~~Rec #1 (path I/O)~~ — **R1-101** / **R1-102** complete (2026-08-01).

---

## File touch map (open items)

| File | R1 IDs |
|------|--------|
| `apps/web/src/lib/filePicker.ts` | R1-101 |
| `apps/web/src/components/project/useProjectFileActions.tsx` | R1-101, R1-505, R1-508 |
| `apps/web/src/components/project/ProjectPathDialog.tsx` | R1-102 |
| `apps/web/src/content/copy.ts` | R1-102, R1-301, R1-501, R1-502, R1-506 |
| `apps/web/src/pages/NewProjectPage.tsx` | R1-301, R1-401, R1-508 |
| `apps/web/src/App.tsx` | R1-508, R1-509, R1-520 |
| `apps/web/src/shell/AppHeader.tsx` | R1-302, R1-510, R1-511, R1-512, R1-514 |
| `apps/web/src/lib/pathUtils.ts` | R1-302, R1-521 |
| `apps/web/src/shell/LeftToolRail.tsx` | R1-303 |
| `apps/web/src/lib/projectStatus.ts` | R1-402, R1-506, R1-507 |
| `apps/web/src/shell/StatusBar.tsx` | R1-402, R1-507 |
| `apps/web/src/shell/ConnectionBanner.tsx` | R1-507 |
| `apps/web/src/hooks/useApiHealthCheck.ts` → `lib/` | R1-503 |
| `apps/web/src/hooks/useLoadProject.ts` → `lib/` | R1-503 |
| `apps/web/src/hooks/useProjectStatus.ts` | R1-504 |
| `apps/web/src/lib/exportNotify.ts` | R1-505, R1-514 |
| `apps/web/src/components/palette/PaletteMoreToolsSection.tsx` | R1-513 |
| `apps/web/src/components/palette/PalettePresetGrid.tsx` | R1-519 |
| `apps/web/src/canvas/Canvas.tsx`, `AnimationPlayer.tsx` | R1-515 |
| `apps/web/src/pages/EditorPage.tsx`, `ImportWizardPage.tsx` | R1-520 |
| `apps/web/src/qa/importMatrix.test.tsx`, `importMatrixHarness.ts` | R1-517, R1-519 |
| `apps/web/src/qa/projectIoMatrix*.ts` | R1-518 |
| `apps/web/src/a11y/sprintUiA11y.test.tsx`, `AppHeader.test.tsx` | R1-516 |
| `apps/web/src/lib/cn.test.ts` | R1-522 (delete) |
| `e2e/smoke.spec.ts`, `e2e/routing.spec.ts`, `e2e/helpers.ts` | R1-201 |
| `scripts/ci-sprint1.sh`, `playwright.config.ts` | R1-201 |
| `docs/workshop/teacher-guide.md`, `docs/user-guide.md` | R1-101, R1-102 |

---

## Quality gate (all R1 items)

Before marking Refactor 1 complete:

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
pnpm --filter @pixelanea/web exec vitest run src/qa/
pnpm exec playwright test
./scripts/ci-sprint1.sh   # if present — must exit 0
```

**Architecture checks**

- [ ] No new backend leakage in React layers
- [ ] New copy only in `content/copy.ts` / `content/errors.ts`
- [ ] Path/status derivations stay pure in `lib/`
- [ ] OpenAPI updated if dialog contract changes
- [ ] **R1.5:** `grep` orphan keys / deleted symbols → zero refs in same PR
- [ ] **R1.5:** LOC budget — deletions ≥ additions on hygiene-only PRs (`git diff --stat`)

**Persona smoke (manual — 15 min each)**

| Persona | Path |
|---------|------|
| Riley | Blank 32×32 → paint → duplicate 8 → play → save → export PNG |
| Casey | Import sample.png → preset → use result → save |
| Morgan | Open template → edit → Save As to USB path (native picker or teacher-assisted fallback) |

---

## Critique → refactor index

| Critique rec | Refactor ID | Status |
|--------------|-------------|--------|
| Jul #1 Native picker | R1-101, R1-102 | done |
| Jul #2 Save state | V-01 | done |
| Jul #3 API jargon | V-02 | done |
| Jul #4 Animation | V-03, R1-301 | done |
| Jul #4 Palette | V-04 | done |
| Jul #5 Onboarding | V-06 | done |
| Jul #6 Export toast | V-08 | done |
| Jul #7 Asset type | V-05 | done |
| Jul #8 Import rail | V-07 | done |
| Jul #9 Animation merge | V-03 | done |
| Jul #10 Health dedupe | V-10 | done |
| Jul #11 Export flags | V-11 | done |
| Aug #1 Server picker QA | R1-101 | done |
| Aug #2 Fallback copy | R1-102 | done |
| Aug #3 E2E green | R1-201 | done |
| Aug #4 Duplicate surfaces | R1-303 | done (option B) |
| Aug #5 Basename header | R1-302 | done |
| Aug #6 Blank card hint | R1-301 | done |
| Aug P2 import parity | R1-401 | done |
| Aug P2 status dedupe | R1-402, R1-507 | done |
| Esteban | Dead copy keys | R1-501, R1-502 | done |
| Esteban | Misnamed `hooks/` | R1-503 | done |
| Esteban | Thin wrappers | R1-504, R1-505 | done |
| Esteban | Dedupe unsaved/disconnect/open | R1-506, R1-507, R1-508 | done |
| Esteban | Guard literal extract | R1-509 | done |
| Esteban | Zoom duplicate | R1-510 | done |
| Esteban | Expand AppHeader exports | R1-511, R1-512 | done |
| Esteban | Details accordion | R1-513 | done |
| Esteban | Flag-dead export/onion | R1-514, R1-515 | done |
| Esteban | Test harness diet | R1-516, R1-517, R1-518 | done |
| Esteban | Theme bootstrap repeat | R1-520 | done |
| Esteban | pathUtils tests | R1-521 | done |
| Esteban | cn.test delete | R1-522 | done |

---

## R1.5 quick index (Esteban)

| ID | Action | Effort | Priority |
|----|--------|--------|----------|
| R1-501 | Delete `frameStripPlaceholder` | S | P3 |
| R1-502 | Delete `apiConnected` | S | P3 |
| R1-503 | Move non-hooks to `lib/` | S | P2 |
| R1-504 | Inline/rename `useProjectStatus` | S | P3 |
| R1-505 | Inline `notifySaveFailure` | S | P3 |
| R1-506 | One unsaved string | S | P2 |
| R1-507 | One disconnect surface | S | P2 |
| R1-508 | Single open-project path | M | P2 |
| R1-509 | Extract guard state helper | S | P3 |
| R1-510 | Remove duplicate zoom menu | S | P3 |
| R1-511 | Named async export fns | M | P2 |
| R1-512 | Split `AppHeader` | L | P2 |
| R1-513 | Simplify palette accordion | S | P3 |
| R1-514 | Delete flag-dead exports | M | P2 |
| R1-515 | Delete onion-skin branch | S | P3 |
| R1-516 | Merge a11y/header test fixtures | M | P3 |
| R1-517 | Trim import matrix overlap | M | P2 |
| R1-518 | Shrink projectIo harness | L | P2 |
| R1-519 | Single preset label map | S | P3 |
| R1-520 | `useThemeBootstrap` once | S | P3 |
| R1-521 | `pathUtils.test.ts` or inline | S | P3 |
| R1-522 | Delete `cn.test.ts` | S | P3 |

---

## References

- [20260731T234500_uxui-design-critique](.cursor/changelog/mvp/20260731T234500_uxui-design-critique/uxui_design_critique.md)
- [20260801T034600_uxui-design-critique](.cursor/changelog/mvp/20260801T034600_uxui-design-critique/uxui_design_critique.md)
- [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md)
- [.cursor/skills/ux-seamless-flows/SKILL.md](.cursor/skills/ux-seamless-flows/SKILL.md)
