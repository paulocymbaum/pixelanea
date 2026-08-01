# UX/UI Design Critique — Full MVP Experience

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-07-31 |
| **Target** | End-to-end MVP: `NewProjectPage` → `ImportWizardPage` / blank create → `EditorPage` shell (header, tool rail, canvas, palette, frame strip, file I/O) |
| **Persona** | All (Riley primary, Casey/Morgan secondary, Alex tertiary) |
| **Scope** | Implemented |

## Job statement

When I want to make pixel art on my own machine, I want to start fast (draw or import), fix mistakes easily, optionally animate, and save a portable file — so I can ship a sprite or leave a workshop with something I made.

## Golden path

**Riley:** Launch → New project → Blank 32×32 → Paint → Duplicate to 8 frames → Edit frames → Play → File → Save → Export PNG

**Casey:** Launch → From image → Drop file → Sprite 32×32 → Palette preset → Preview → Use result → Cleanup paint → Save → Export PNG

**Morgan:** Open template `.pixelanea` → Paint / Fix mistakes / Undo → Save As to USB → (optional) Play

## Dialogue summary

**Maya** opened by noting the architecture is sound — two front doors, skippable onboarding, plain copy in `content/`, canvas ≥60vw — but the **exit states** (save, sync, export feedback) and **status chrome** undermine the promise for non-dev personas.

**Leo** agreed the visual system is coherent (tokens, tool-button active state, import step indicator) but argued the **right palette panel** and **status bar** fight the canvas for attention: too many primary-weight controls in the palette stack, and monospace API text where save state should live.

**Tension:** Maya wants a third "Animation" card on the new-project screen (DESIGN.md parity); Leo prefers keeping two cards and promoting animation via a post-draw empty-state CTA in the frame strip region — less launch clutter, more contextual discovery. Recorded as unresolved; recommendation leans Leo for v1 if animation CTA is added.

**Convergence:** Four P0 items (path-based I/O, hidden save state, API jargon in status bar, animation entry buried), six P1, five P2. Proactive fixes are mostly copy, hierarchy, and disclosure — not a shell rewrite.

**Esteban (tech lead) — flow simplification pass:** Joined rounds 5–6. Flagged **seven redundant or overlapping flows** with concrete merge/cut proposals. Strongest cuts: remove dead **Import** tool from rail (no `tools/registry` handler); collapse **animation-at-create** vs **duplicate-frames** into one canonical path; dedupe **health checks**; demote post-MVP **GIF/spritesheet/onion-skin** from primary chrome until ship gate. See "Flow simplification (Esteban)" below.

## Findings

### Critical (P0) — blocks task completion or trust

- **Manual path dialogs for Open/Save** (`ProjectPathDialog.tsx`) — users must type absolute paths (placeholder: `/home/you/projects/my-art.pixelanea`). Morgan's workshop gate (>80% save rate) and Casey's "no docs" goal fail here; this is the single largest MVP friction point.
- **No visible save/dirty/sync state** — `isDirty`, `syncStatus`, and `frameSyncStatus` exist in `editorStore` but never surface in header or `StatusBar.tsx`. Violates ux-seamless-flows mistake #2 (hidden system state). Users cannot tell if work is saved or syncing.
- **Status bar shows implementation jargon** — `StatusBar.tsx` displays "API connected · Server v1.0" / "Checking API…" instead of user-facing project status. Casey and Morgan read this as "the app is broken" when disconnected; violates UX.md plain-microcopy and mistake #8.
- **Animation golden path is buried** — DESIGN.md specifies three equal entry paths (blank / import / animation). `NewProjectPage.tsx` only exposes two cards; 8/16/32 frame choice lives inside the blank sub-flow (`AnimationFrameCountStep`). Riley's walk-cycle job requires discovering "Duplicate frames" in a 7-item tool rail after starting single-frame — extra hops past the documented <45 min success path.

### Warnings (P1) — meaningful friction or inconsistency

- **Palette panel overload for Casey** — `RightPalettePanel.tsx` stacks swatches, shading generator, color filters, presets, actions, and save in one scroll column. Power features (filters, shading) compete with primary swatch picking — mistake #5 (cognitive overload).
- **Save As forces asset-type decision** — first save opens `ProjectPathDialog` with Character/Prop/Background/Animation grid before path entry. Extra decision Morgan does not need; should default to Character with "Advanced" collapse.
- **Onboarding step 2 blocks the canvas** — `SkippableOverlay.tsx` step 2 is centered (`left-1/2 top-1/2`), covering the exact area users must click to paint. Contradicts "paint your first pixel" instruction.
- **"Import" remains in the tool rail** — `LeftToolRail.tsx` lists Import alongside paint tools (`CHROME_TOOLS`). Post-wizard, Casey sees a second import entry point with no clear difference from File → New.
- **Undo/redo split across UI** — prominent labeled buttons in `UndoRedoToolbar.tsx` *and* buried in File/Edit menus. Good for Morgan in toolbar; inconsistent with menu-only zoom. Minor pattern drift.
- **Export success is silent** — PNG/GIF/spritesheet export triggers download with no toast or confirmation (save does toast). Mistake #12 (no feedback loop).

### Suggestions (P2) — polish and delight

- **New-project visual hierarchy** — tagline uses accent uppercase tracking; primary cards could use DESIGN.md split wordmark on first launch for brand warmth without canvas competition.
- **Frame strip empty affordance** — when `frameCount <= 1`, bottom region is empty; a one-line "Add frames for animation" link near tool rail or collapsed strip hint would guide Riley without permanent chrome.
- **Import card selection parity** — blank card gets selected-state border (`border-accent bg-accent-muted`); import card jumps away on click — minor asymmetry on the two front doors.
- **Theme toggle is icon-only** — `AppHeader.tsx` `ThemeToggle` has `aria-label` but no visible label; acceptable for Riley, marginal for Morgan projector legibility.
- **Resolution presets are strong** — `resolutionPresets.ts` ("Icon", "Sprite", "Detail") already match UX.md; surface the same labels on blank-project `CanvasSizeStep` for consistency.

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — ⚠️ Save buried in File menu; animation via obscure tool
- [ ] State visible (loading/saved/error)? — ❌ Dirty/sync not shown; API status instead
- [ ] Modals justified? — ✅ Duplicate frames, overwrite, off-palette export are appropriate
- [ ] Patterns consistent? — ⚠️ Feedback differs (save toasts, export silent)
- [ ] Overwhelming on first visit? — ⚠️ Palette panel heavy; editor core is OK
- [ ] Edge cases designed? — ⚠️ API disconnect yes; unsaved navigation unclear
- [ ] Hierarchy matches priority? — ⚠️ Status bar prioritizes dev info over user state
- [ ] Beauty serves clarity? — ✅ Canvas hero, calm chrome, good tokens overall

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ⚠️ | Import path strong; Riley animation path weak |
| One decision per step | ✅ | Import wizard steps are clean |
| Progressive disclosure | ⚠️ | Frame strip hidden ≤1 frame ✅; palette panel too eager |
| Immediate feedback | ⚠️ | Paint instant ✅; save/export/sync feedback incomplete |
| Forgiving (undo/autosave) | ✅ | Undo/redo visible; eraser "Fix mistakes"; debounced persist |
| Visual hierarchy | ⚠️ | Canvas hero ✅; status bar and palette panel noisy |
| Flow tested end-to-end | ⚠️ | Code paths exist; path I/O likely fails real-user timed tasks |

## Agreed recommendations

1. **Replace path text fields with native file picker in desktop build** — or browser `showOpenFilePicker` / `showSaveFilePicker` where available; keep path dialog as fallback only. **Owner:** eng · **Effort:** L
2. **Add project status to header or status bar** — "Saved" / "Unsaved changes" / "Saving…" / sync error with plain copy; demote or hide API version behind View → technical info. **Owner:** ux + eng · **Effort:** M
3. **Surface animation entry earlier** — either third new-project card ("Start animated — 8 frames") *or* post-draw CTA + onboarding step mentioning Duplicate frames. **Owner:** ux · **Effort:** M
4. **Collapse palette power tools** — move `PaletteShadingSection` and `ColorFiltersSection` behind "More tools" accordion default-closed. **Owner:** ui + eng · **Effort:** S
5. **Reposition onboarding step 2** — anchor near canvas edge (bottom-center) with pointer, not viewport center. **Owner:** ui · **Effort:** S
6. **Toast on export complete** — "PNG exported." / "GIF exported." with filename. **Owner:** ux · **Effort:** S
7. **Default Save As asset type** — pre-select Character; tuck grid under "Asset type (optional)". **Owner:** ux · **Effort:** S
8. **Remove or relocate Import tool** — File → Import image only, or move to header action; keep tool rail for paint operations. **Owner:** ux · **Effort:** S
9. **Collapse duplicate animation entry points** — pick *either* `AnimationFrameCountStep` at create *or* `FrameDuplicateDialog` post-draw as the one supported path; deprecate the other in UI. **Owner:** ux + eng · **Effort:** M
10. **Single health-check on boot** — `App.tsx` only; remove duplicate from `EditorPage.tsx`. **Owner:** eng · **Effort:** S
11. **Hide post-MVP export/onion controls** — GIF, spritesheet, onion skin behind View → Advanced or feature flag until BACKLOG ship gate. **Owner:** ux + eng · **Effort:** S

## Flow simplification (Esteban)

| Flow / surface | Verdict | Rationale | Proposed action |
|----------------|---------|-----------|-----------------|
| **Import wizard route** (`import-wizard`) vs **new-project** | Keep both routes, simplify mental model | Separate route is fine for code isolation; friction is duplicate *entry*, not duplicate *page* | Keep `ImportWizardPage`; do not add a second in-editor import path |
| **Import tool** in `LeftToolRail` | **Cut — redundant & broken** | Listed in `content/tools.ts` and `CHROME_TOOLS` but absent from `tools/registry.ts`; click sets `activeTool: "import"` with no handler — canvas goes dead | Remove from rail; optional File → "Import image…" routes to wizard |
| **Animation at create** (`AnimationFrameCountStep`) vs **Duplicate frames** (`FrameDuplicateDialog`) | **Merge — redundant** | Both call the same backend concept (project `frameCount` 8/16/32). Two UIs, two mental models, same outcome | **Canonical:** duplicate dialog after frame 0 (Riley's real workflow). Hide animation toggle on new-project blank flow; or auto-skip to 8 frames only via quick-start chip |
| **Palette presets** — wizard step vs editor panel | Keep data, simplify surfaces | `palettePresets.ts` is shared ✅; `PalettePresetStep` and `PalettePresets` duplicate UI | Wizard step stays; editor presets move below fold in collapsed accordion |
| **Palette Save button** vs **frame autosave** | Simplify messaging, not necessarily code | Two persistence models confuse everyone; autosave already runs for frames | Keep autosave; palette edits flush on project save; demote "Save palette" or auto-persist like frames |
| **Undo/redo** — toolbar + Edit menu | **Cut menu duplication** | `UndoRedoToolbar` is the right surface for Morgan | Remove Undo/Redo from Edit menu; keep zoom in View only |
| **Export menu** — PNG + spritesheet + GIF | **Defer 2 of 3 for MVP** | BACKLOG lists GIF/spritesheet as post-v1; shipping them raises support surface before path I/O is fixed | MVP menu: Export PNG only; tuck others behind "More exports…" |
| **API health check** | **Dedupe** | `checkHealth()` runs in both `App.tsx` and `EditorPage.tsx` | Once at app mount; status derived in store |
| **Asset type on Save As** | **Default away** | Metadata for bundle manifest, not a user job on first save | Default `character`; optional expander |
| **Onboarding overlay** vs **import wizard** | Keep both, different personas | Riley gets 3-step skippable; Casey gets wizard-as-onboarding per UX.md | No merge; fix overlay placement only |

### Esteban's recommended cut list (ship-order)

1. Remove Import from tool rail (broken today).
2. Dedupe health check.
3. Pick one animation path (vote: post-draw duplicate dialog).
4. Collapse export menu to PNG for MVP gate.
5. Native file picker (already P0 — unblocks everything else).

## Unresolved tension

**Third new-project card vs. contextual animation CTA:** Maya cites DESIGN.md's three equal doors and Riley's time-to-walk-cycle metric. Leo argues a third card splits first-visit attention and Casey's import door should stay visually equal to blank. **Proposed compromise:** two cards at launch + prominent "Start with 8 frames" chip inside the blank expand panel *and* empty-state hint after first paint.

**Animation at create vs. duplicate-after-draw:** Maya/Leo lean contextual CTA. **Esteban votes duplicate-dialog only** — one API path (`duplicateFrames`), one UI, less `NewProjectPage` branching. Removing `AnimationFrameCountStep` from blank create is a 50-line simplification and kills the "which animation flow?" confusion. Maya accepts if quick-start can still pass `frameCount: 8` for power users who know they want a walk cycle upfront.

## Files reviewed

- `UX.md`, `DESIGN.md`, `BACKLOG.md` (MVP scope)
- `apps/web/src/App.tsx`
- `apps/web/src/pages/NewProjectPage.tsx`
- `apps/web/src/pages/EditorPage.tsx`
- `apps/web/src/pages/ImportWizardPage.tsx` (via `PixelateWizard.tsx`)
- `apps/web/src/components/import/PixelateWizard.tsx`
- `apps/web/src/components/import/ResolutionStep.tsx`
- `apps/web/src/components/import/ImportStepIndicator.tsx`
- `apps/web/src/components/onboarding/SkippableOverlay.tsx`
- `apps/web/src/shell/AppHeader.tsx`
- `apps/web/src/shell/EditorLayout.tsx`
- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/shell/RightPalettePanel.tsx`
- `apps/web/src/shell/BottomFrameStrip.tsx`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/components/animation/AnimationPlayer.tsx`
- `apps/web/src/components/frames/FrameDuplicateDialog.tsx`
- `apps/web/src/components/project/ProjectPathDialog.tsx`
- `apps/web/src/components/project/useProjectFileActions.tsx`
- `apps/web/src/components/toolbar/UndoRedoToolbar.tsx`
- `apps/web/src/content/copy.ts`
- `apps/web/src/content/errors.ts`
- `apps/web/src/content/tools.ts`

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — 12 mistakes + 10 practices
- `UX.md` — personas, flows, microcopy, creative-freedom principles
- `DESIGN.md` — shell layout, new-project screen, component tokens
- `BACKLOG.md` — MVP ship gate criteria
