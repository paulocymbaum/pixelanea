# UX/UI Design Critique — Sprint 1 MVP (Follow-up)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-01 |
| **Target** | Delta review vs [20260731T234500 critique](../20260731T234500_uxui-design-critique/uxui_design_critique.md); same MVP surfaces |
| **Persona** | All (Riley primary) |
| **Scope** | Implemented (post–Sprint 1 polish pass) |

## Job statement

When I return after the first critique's recommendations landed, I want to see whether Riley and Morgan can complete their golden paths without hidden state, dead tools, or path typing — so we can judge MVP ship readiness honestly.

## Golden path (unchanged)

**Riley:** Launch → New project → Blank 32×32 (or 8-frame quick-start) → Paint → Duplicate to 8 frames → Edit frames → Play → Save → Export PNG

**Casey:** Launch → From image → Drop file → Sprite 32×32 → Palette preset → Preview → Use result → Cleanup paint → Save → Export PNG

**Morgan:** Open template `.pixelanea` → Paint / Fix mistakes / Undo → Save As to USB → (optional) Play

## Dialogue summary

**Maya** opened the follow-up by scoring the July 31 report: **9 of 11 agreed recommendations shipped**; the shell now communicates save/sync state, demotes dev jargon, and removes the broken Import tool. The unresolved compromise (two cards + contextual animation CTA) is **largely implemented** via `newProjectQuickStart8`, `FrameStripPlaceholder`, and onboarding step 4.

**Leo** confirmed visual hierarchy improved: palette power tools collapsed, theme toggle has a text label at `lg`, onboarding step 2 no longer occludes the canvas, and `features.ts` keeps export chrome minimal. Remaining noise: **full bundle path** in the header center and **three duplicate-frame entry points** (tool rail, frame-strip CTA, onboarding copy).

**Esteban (tech lead)** joined rounds 5–6. Verified eng delivery against his cut list: Import rail removed, health check deduped to `App.tsx`, `AnimationFrameCountStep` gone, GIF/spritesheet/onion behind flags, `pickProjectPath` tiering wired in `useProjectFileActions`. **Verdict:** UX debt dropped from "shell rewrite" to **one P0 (path fallback) + ship-gate hygiene (E2E red, path placeholder copy)**. Opposes re-opening a third new-project card; current two-door + chips model is the right freeze for Sprint 1.

**Convergence:** 1 P0, 4 P1, 3 P2 for this follow-up. Prior P0 #1 (path I/O) is the only carry-over blocker; everything else is polish or test stability.

## Findings

### Critical (P0) — blocks task completion or trust

- **Path fallback still requires absolute paths** — `pickProjectPath` (`filePicker.ts`) correctly tries `tryServerDialogTier` first, but browser/FSA tiers decline and `ProjectPathDialog` still shows a text field with placeholder `/home/you/projects/my-art.pixelanea`. Morgan's workshop save gate and Casey on a plain browser build still hit manual paths when the server dialog is unavailable (503). Partial fix is not sufficient for MVP trust.

### Warnings (P1) — meaningful friction or inconsistency

- **First-visit animation discovery** — `newProjectQuickStart8` lives inside the expanded blank panel and on the return-visit quick row, not on the two front-door cards. Riley's first session still requires expanding "Blank canvas" or painting before `FrameStripPlaceholder` / tool-rail Duplicate appears. Acceptable per July compromise, but timed walk-cycle metric still at risk on visit 1.
- **Triple duplicate-frame surfaces** — `LeftToolRail` Duplicate button, `FrameStripPlaceholder` primary CTA, and onboarding step 4 all route to `FrameDuplicateDialog`. Not broken, but three equal-weight affordances for one job; pick one hero surface post-Sprint 1.
- **Bundle path in header** — `AppHeader` renders full `bundlePath` under the project name. Correct for power users; Morgan on a projector reads long filesystem strings. Consider basename + tooltip (already has `title`) as default display.
- **E2E smoke/routing specs red** — Playwright artifacts under `test-results/` indicate golden-path automation is failing. UX ship gate should not pass while Riley's scripted path is broken in CI.

### Suggestions (P2) — polish and delight

- **Import card selection asymmetry** — `NewProjectPage` import card calls `onStartImport()` directly without `selectedPath` highlight; blank card toggles expand state. Minor first-visit visual imbalance between the two doors.
- **Status bar empty on fresh editor** — `deriveProjectStatus` returns `idle` until `hasProject`; status bar left side is blank pre-project. Low impact once editor loads.
- **Connection banner vs status bar** — disconnect shows both `ConnectionBanner` (alert) and status-bar danger text. Redundant but accessible; could demote status-bar duplicate when banner visible.

## Delta vs July 31 critique

| Prior item | Status | Evidence |
|------------|--------|----------|
| P0 path dialogs | ⚠️ Partial | `pickProjectPath` + server tier; fallback dialog unchanged |
| P0 save/dirty/sync hidden | ✅ Fixed | `useProjectStatus`, `StatusBar`, header unsaved dot |
| P0 API jargon in status bar | ✅ Fixed | Project status primary; `showTechnicalInfo` gates version |
| P0 animation buried | ✅ Mostly | Quick-start 8, frame-strip CTA, onboarding step 4; `AnimationFrameCountStep` removed |
| P1 palette overload | ✅ Fixed | `PaletteMoreToolsSection` default-closed |
| P1 Save As asset type | ✅ Fixed | `DEFAULT_ASSET_TYPE` + `<details>` advanced grid |
| P1 onboarding blocks canvas | ✅ Fixed | Step 2 at `bottom-24` |
| P1 Import tool in rail | ✅ Fixed | `PAINT_TOOL_IDS` only + Duplicate |
| P1 export silent | ✅ Fixed | `exportNotify.ts` |
| P1 undo menu duplication | ✅ Fixed | Edit menu removed; `UndoRedoToolbar` only |
| P2 frame strip empty hint | ✅ Fixed | `FrameStripPlaceholder` |
| P2 theme icon-only | ✅ Fixed | `themeToggleLabel` at `lg` |
| Esteban: dedupe health | ✅ Fixed | `App.tsx` only |
| Esteban: export flags | ✅ Fixed | `content/features.ts` |
| Esteban: one animation path | ✅ Fixed | Duplicate dialog canonical; create-time step removed |
| Esteban: palette save demote | ✅ Fixed | `PaletteSaveButton` deleted |

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — Save button in header; animation via duplicate + chips
- [x] State visible (loading/saved/error)? — Project status in bar + header
- [x] Modals justified? — Unchanged; still appropriate
- [x] Patterns consistent? — Export now toasts like save
- [x] Overwhelming on first visit? — Palette collapsed; frame strip progressive
- [ ] Edge cases designed? — Path fallback and E2E failures remain gaps
- [x] Hierarchy matches priority? — Dev info opt-in via View menu
- [x] Beauty serves clarity? — Canvas hero preserved

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ✅ | Riley path shortened vs July 31 |
| One decision per step | ✅ | Import wizard unchanged |
| Progressive disclosure | ✅ | More tools, frame strip, technical info |
| Immediate feedback | ✅ | Save, export, sync error copy |
| Forgiving (undo/autosave) | ✅ | Toolbar + debounced persist |
| Visual hierarchy | ⚠️ | Header path string noisy |
| Flow tested end-to-end | ❌ | E2E red; path fallback untested for Morgan |

## Agreed recommendations

1. **Ship native path picker as default tier in desktop builds** — ensure `tryServerDialogTier` succeeds in production; browser fallback remains last resort with clearer "Pick a folder" copy if server returns 503. **Owner:** eng · **Effort:** M (integration QA, not new UI)
2. **Soften path fallback microcopy** — replace absolute-path placeholder with action-led hint ("Choose where to save…") and link to workshop doc snippet. **Owner:** ux · **Effort:** S
3. **Fix Playwright smoke + routing specs** — unblock Riley golden path in CI before MVP sign-off. **Owner:** eng · **Effort:** M
4. **Pick one hero duplicate-frame surface** — demote tool-rail Duplicate to icon-only secondary or remove in favor of frame-strip CTA once `frameCount > 0`. **Owner:** ux · **Effort:** S
5. **Header bundle path: show basename only** — full path in `title` tooltip. **Owner:** ui · **Effort:** S
6. **First-visit 8-frame hint on blank card** — one line under "Blank canvas" description: "Or start with 8 frames for animation" (no third card). **Owner:** ux · **Effort:** S

## Flow simplification (Esteban) — follow-up

| Surface | July verdict | Aug 1 status | Next action |
|---------|--------------|--------------|-------------|
| Import tool rail | Cut | ✅ Removed | None |
| Animation at create vs duplicate | Merge | ✅ `AnimationFrameCountStep` gone | Freeze |
| Health check dedupe | Cut duplicate | ✅ `App.tsx` only | None |
| Export menu | PNG only for MVP | ✅ `features.ts` flags | None |
| Native file picker | P0 | ⚠️ Tier wired; fallback still manual | QA desktop dialog path |
| Duplicate-frame entry points | — | ⚠️ Three surfaces | Pick one hero (rec #4) |
| Palette save vs autosave | Demote save | ✅ Button removed | None |

**Esteban ship-order for Sprint 1 close:**

1. Green E2E smoke (proves golden path).
2. Verify server dialog tier on target desktop build.
3. UX copy pass on path fallback only if (2) fails in browser-only workshops.

## Unresolved tension

**Tool-rail Duplicate vs frame-strip CTA:** Leo wants the bottom-strip primary button as the visual hero (closer to animation region). Maya wants tool-rail Duplicate for discoverability before first paint. **Esteban:** keep both for Sprint 1; remove rail button only if analytics/show user testing proves strip CTA is found. Revisit post-MVP.

## Files reviewed

- `.cursor/changelog/mvp/20260731T234500_uxui-design-critique/uxui_design_critique.md` (prior report)
- `apps/web/src/lib/filePicker.ts`
- `apps/web/src/components/project/useProjectFileActions.tsx`
- `apps/web/src/components/project/ProjectPathDialog.tsx`
- `apps/web/src/hooks/useProjectStatus.ts`
- `apps/web/src/lib/projectStatus.ts`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/shell/ConnectionBanner.tsx`
- `apps/web/src/shell/AppHeader.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/shell/RightPalettePanel.tsx`
- `apps/web/src/components/palette/PaletteMoreToolsSection.tsx`
- `apps/web/src/components/frames/FrameStripPlaceholder.tsx`
- `apps/web/src/components/onboarding/SkippableOverlay.tsx`
- `apps/web/src/pages/NewProjectPage.tsx`
- `apps/web/src/content/features.ts`
- `apps/web/src/content/copy.ts`
- `apps/web/src/App.tsx`
- `e2e/smoke.spec.ts`, `e2e/routing.spec.ts`

## References

- Prior critique: `.cursor/changelog/mvp/20260731T234500_uxui-design-critique/`
- `.cursor/skills/ux-seamless-flows/SKILL.md`
- `UX.md`, `DESIGN.md`, `BACKLOG_SPRINT_1.md`
