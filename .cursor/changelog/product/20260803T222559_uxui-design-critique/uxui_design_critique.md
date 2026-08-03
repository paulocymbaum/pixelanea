# UX/UI Design Critique — Pixelanea Full Product (v1 Production Readiness)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Target** | Full product — editor shell, new project, import wizard, drawing tools, palette, animation, project I/O, export, onboarding, errors, desktop install |
| **Personas** | Riley (primary), Casey, Morgan, Alex — per UX.md |
| **Scope** | Implemented UI (code + E2E specs inspected) |

## Job statement

When I want to make pixel art on my own machine, I want a calm editor that gets me painting or importing quickly, keeps my work safe locally, and supports animation and export — so I can ship sprites without accounts, cloud, or a manual.

## Golden path

**Riley:** Launch → Start blank → Create 32×32 → Skip tour → Paint → Duplicate to 8 frames → Play → Save → Export PNG

**Casey:** Launch → From image → Drop file → Sprite 32×32 → Match my image → Preview → Use this result → Tweak palette → Save → Export PNG

**Morgan:** Open template `.pixelanea` → Paint / Fix mistakes → Save As → (optional) Play

**Alex:** New 16×16 → Define palette → Lock palette → Paint with technical info → Export (off-palette warning if needed)

## Dialogue summary

**Maya ↔ Leo — condensed**

- **R1 (Job & golden path):** Maya: Riley's walk-cycle path is end-to-end covered by `e2e/smoke.spec.ts` — paint, duplicate, save, reload. Casey import path is a true second front door on `NewProjectPage`. Leo: Shell honors canvas-as-hero (`min-w-[60vw]` in `EditorLayout.tsx`); chrome is token-consistent. Gap: UX.md promises canvas auto-focus on entry — no `autoFocus` or focus transfer in `Canvas.tsx`.
- **R2 (Mistakes audit):** Maya: Trust signals are strong — status bar saved/unsaved/saving, header dot, toasts, `ConnectionBanner`. Route-level unsaved guard in `App.tsx` omits "Save, then continue" while File-menu guard in `useProjectFileActions.tsx` includes it — inconsistent (mistake #4). Leo: `LeftToolRail` duplicate-frames control is icon-only — breaks DESIGN.md icon+label rule and Morgan's projector readability (mistake #7, #9). Palette section rail is icon-only with tooltips — acceptable for Alex, risky for Morgan.
- **R3 (Practices & polish):** Maya: Import wizard nails one-decision-per-step with back navigation and plain errors (`errors.ts`). Onboarding is skippable, 4 steps, blocked until API connected — good for trust, slight delay on slow start. Leo: Typography and tokens align with DESIGN.md (Outfit 14px body, accent focus rings, `prefers-reduced-motion` in `globals.css`). Animation player is dense when onion skin + boomerang expanded — competes with frame strip on narrow widths.
- **R4 (Edge cases & synthesis):** Maya: Error paths are designed — bad file type, missing bundle, API down with retry. `bundleDirty` (saved to disk but session edits) uses header dot only, not status bar text — Alex/Riley may not distinguish "synced" vs "needs Save As again". BACKLOG: workshop teacher kit (E2-014) not shipped — Morgan v1 caveat. Leo: New project screen is 2 cards not DESIGN's 3 equal paths (animation folded into blank secondary CTA) — acceptable progressive disclosure, not spec-exact. Agreed verdict: **Ready with caveats**.

## Findings

### Critical (P0) — blocks task completion or trust

1. **Route-level unsaved guard lacks save path** — `App.tsx` renders `UnsavedChangesDialog` with only Discard / Keep editing when navigating Editor → Import wizard (via `startImport` → `requestEditorRouteChange`). File-menu navigation offers "Save, then continue" via `useProjectFileActions.tsx`. Users who trigger import from a path wired to the route guard risk accidental data loss. *(ux, eng — M)*

### Warnings (P1) — meaningful friction or inconsistency

1. **Duplicate frames control is icon-only on tool rail** — `LeftToolRail.tsx` lines 58–69: `aria-label` only, no visible label. Violates DESIGN.md toolbar spec and Morgan persona requirement for icon + text always.
2. **Canvas not auto-focused on editor entry** — UX.md Flow 1 specifies "Canvas focused"; implementation relies on user click. Slows Riley's <60s first-pixel metric marginally.
3. **Palette panel cognitive load for Casey** — Four section tabs (Swatches, Presets, Shading, Filters) visible in `PaletteSectionRail.tsx`; shading/filters are power features that compete with import-first users despite progressive tab isolation.
4. **Unsaved-to-disk vs unsaved-to-bundle ambiguity** — `bundleDirty` tracked in `unsavedGuard.ts` but `deriveProjectStatus` ignores it for status bar copy; only header orange dot signals. Riley/Morgan may think work is saved after autosync when bundle file is stale.
5. **Workshop teacher kit not shipped** — BACKLOG E2-014 (printable template + PDF) open; Morgan success metric (80%+ students save) depends on facilitator materials outside the app.
6. **Shortcuts overlay incomplete zoom keys** — `ShortcutsOverlay.tsx` shows "—" for zoom in/out/fit; undermines keyboard parity claim in README.
7. **Animation controls density** — `AnimationPlayer.tsx` packs play, FPS, loop, boomerang, onion skin + opacity slider; may wrap/clutter bottom strip below ~1200px width.
8. **New project screen vs DESIGN spec** — DESIGN.md "three equal-weight entry paths" (blank / import / animation) implemented as two cards + inline 8-frame secondary button on blank path (`NewProjectPage.tsx`).

### Suggestions (P2) — polish and delight

1. **Onboarding step count** — UX.md describes 3-step overlay; implementation has 4 steps including animation (`SkippableOverlay.tsx`). Harmless but doc drift.
2. **Palette section rail labels** — Icon-only with tooltip; add abbreviated text labels at ≥1024px for classroom projector.
3. **Brand asset gaps** — DESIGN.md checklist: favicon set, app icons, logo lockups still pending — affects desktop install polish, not in-app editor.
4. **First-visit returning-user UX** — Quick-start on `NewProjectPage` is excellent; consider subtle "Open existing" prominence for Morgan's template distribution flow.
5. **Empty canvas hint** — Present and on-brand (`copy.emptyCanvasHint`); could dismiss after first paint (already does via `canvasIsBlank` check).

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — New project cards, wizard Continue, header Save
- [x] State visible (loading/saved/error)? — Status bar + banner + toasts; bundleDirty gap (see P1)
- [x] Modals justified? — Discard, overwrite, duplicate frames, off-palette export
- [ ] Patterns consistent? — Route vs File unsaved guard diverge (P0)
- [x] Overwhelming on first visit? — Mostly no; palette tabs borderline for Casey
- [x] Edge cases designed? — File type, API down, damaged bundle, transparent PNG import (E2E)
- [ ] Hierarchy matches priority? — Duplicate frames label missing (P1)
- [x] Beauty serves clarity? — Tokens, flat chrome, canvas hero

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ✅ | Smoke + import E2E cover Riley & Casey |
| One decision per step | ✅ | Import wizard steps; new project resolution panel |
| Progressive disclosure | ⚠️ | Frame strip hidden until >1 frame; palette tabs expose power tools early |
| Immediate feedback | ✅ | Paint sync, status bar, export toasts |
| Forgiving (undo/autosave) | ✅ | 500-step undo, debounced sync, unsaved guards |
| Visual hierarchy | ⚠️ | Canvas hero strong; tool rail duplicate label gap |
| Flow tested end-to-end | ✅ | `e2e/smoke`, `import`, `export`, `routing`, `errors`, `onboarding` |

## Agreed recommendations

1. **Wire "Save, then continue" into route-level `UnsavedChangesDialog`** in `App.tsx`, reusing `useProjectFileActions` save-before-nav pattern. *(eng — M)*
2. **Add visible text label to duplicate-frames control** on `LeftToolRail` (match other tools: icon + abbreviated copy). *(ui — S)*
3. **Surface bundle-dirty state in status bar** when `bundleDirty && !isDirty` — e.g. distinct copy from sync unsaved. *(ux — S)*
4. **Default Casey palette panel to collapsed or Swatches-only** on import entry; hide Shading/Filters behind "More tools" until second session. *(ux/ui — M)*
5. **Focus canvas on editor mount** after project load (one `canvasRef.focus()` in `Canvas.tsx` or `EditorPage`). *(eng — S)*
6. **Ship workshop teacher kit (E2-014)** before positioning Morgan as a release persona. *(product — L)*
7. **Fill zoom shortcut placeholders** in `ShortcutsOverlay.tsx`. *(eng — S)*

## Production readiness verdict

| Field | Value |
|-------|-------|
| **Verdict** | **Ready with caveats** |
| **Confidence** | **Medium** — strong implementation evidence and passing E2E smoke; limited live persona validation |

### Blockers (must fix before public release)

- P0 #1: Route-level unsaved guard without save path — data-loss risk on Editor → Import navigation

### Caveats (acceptable for v1 if documented)

- Workshop teacher kit not in repo (facilitators need `docs/workshop/teacher-guide.md` + manual template distribution)
- Palette power tabs visible by default (Casey may need hand-holding)
- Icon-only duplicate-frames and palette section rail (Morgan projector)
- Brand/installer asset polish (favicon, icons) per DESIGN.md checklist
- No Windows desktop shell yet (Linux + web dev scope only)

### Persona fit

| Persona | Readiness | Notes |
|---------|-----------|-------|
| **Riley** | ✅ Strong | Walk cycle, save, export, shortcuts, animation player all implemented; minor focus + bundle-dirty clarity gaps |
| **Casey** | ⚠️ Good | Import wizard is excellent equal front door; palette density may exceed <5 min goal for some users |
| **Morgan** | ⚠️ Conditional | No login/cloud, plain errors, eraser labeled "Fix mistakes", 40px touch targets on buttons; missing printable kit; some icon-only controls |
| **Alex** | ✅ Strong | Palette lock, technical info in status bar, off-palette export warning, presets, custom canvas sizes |

### Rationale

Pixelanea delivers on its core promise: local-first pixel editing with two front doors, trustworthy save/sync feedback, animation, and export. Code inspection and E2E specs confirm Riley and Casey golden paths work. Visual design largely matches DESIGN.md — calm chrome, semantic tokens, accessible focus and reduced motion. The product is **not** "not ready": feature completeness on main aligns with README claims.

It is **not unconditionally ready** either: one trust-critical inconsistency (route unsaved guard), Morgan facilitator dependencies outside the app, and several P1 accessibility/consistency gaps prevent a confident "ship everywhere" verdict. Fixing P0 #1 and documenting Morgan/Casey caveats is sufficient for a cautious v1 Linux desktop + web dev release.

## Unresolved tension

- **Maya** wants palette Shading/Filters hidden until intent is shown (Casey protection).
- **Leo** argues the section rail is already visually quiet (40px icons, tooltips) and hiding tabs reduces discoverability for Riley power users.
- **Product call:** defer hiding to v1.1 unless Casey usability tests show bounce at palette panel.

## Files reviewed

- `UX.md`, `DESIGN.md`, `BACKLOG.md`, `README.md`, `docs/user-guide.md`
- `apps/web/src/pages/NewProjectPage.tsx`, `EditorPage.tsx`, `ImportWizardPage.tsx`
- `apps/web/src/shell/AppHeader.tsx`, `EditorLayout.tsx`, `LeftToolRail.tsx`, `RightPalettePanel.tsx`, `BottomFrameStrip.tsx`, `StatusBar.tsx`, `ConnectionBanner.tsx`
- `apps/web/src/components/import/PixelateWizard.tsx`, `types.ts`
- `apps/web/src/components/onboarding/SkippableOverlay.tsx`, `ShortcutsOverlay.tsx`
- `apps/web/src/components/animation/AnimationPlayer.tsx`
- `apps/web/src/components/palette/PaletteLock.tsx`, `PaletteSectionRail.tsx`
- `apps/web/src/components/project/UnsavedChangesDialog.tsx`, `useProjectFileActions.tsx`, `OffPaletteExportDialog.tsx`
- `apps/web/src/canvas/Canvas.tsx`
- `apps/web/src/content/copy.ts`, `errors.ts`, `features.ts`, `tools.ts`
- `apps/web/src/App.tsx`, `lib/projectStatus.ts`
- `e2e/smoke.spec.ts`, `onboarding.spec.ts`, `import.spec.ts`, `export.spec.ts`, `errors.spec.ts`, `routing.spec.ts`, `palette-panel.spec.ts`

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — 12 mistakes + 10 practices
- `UX.md` — personas, flows, success metrics, microcopy
- `DESIGN.md` — tokens, shell layout, component specs
- `BACKLOG.md` — post-v1 and workshop items
