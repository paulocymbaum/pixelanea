# Loop Backlog — v1 Linux Release UX Polish

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | product |
| **Trigger** | Full-product UX/UI production-readiness critique (`20260803T222559_uxui-design-critique`) invoked via `/AGENT-product-refinement` |
| **Horizon** | Next implementation batch → v1 Linux desktop public release |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

The UX/UI critique rated Pixelanea **Ready with caveats** (medium confidence). Riley and Alex personas are release-ready; Casey and Morgan have friction gaps. One P0 data-loss risk was confirmed in code: `App.tsx` renders `UnsavedChangesDialog` without `onSave`/`canSave` for Editor → Import navigation, while `useProjectFileActions` offers "Save, then continue" for File-menu paths. No OpenAPI, DB migration, or backend work is required for any critique item — all are frontend, docs, or asset deliverables. Target is Linux v1 desktop public release; Windows shell is out of scope.

## Dialogue summary

- **R1:** Sam framed the loop goal as a shippable Batch 1 that fixes the P0 trust gap and the highest-value P1 trust/accessibility wins before Linux v1. Jordan agreed the critique evidence is solid (`App.tsx` lines 142–152 vs `useProjectFileActions` lines 446–457) and that Batch 1 must not depend on workshop kit or palette redesign.
- **R2:** Jordan flagged that zoom shortcut rows show "—" because `shortcuts.ts` has no zoom key handlers — fixing the overlay alone is misleading; either wire shortcuts or remove rows. Sam accepted deferring zoom to Batch 2. Jordan confirmed `deriveProjectStatus` intentionally ignores `bundleDirty` (test at `projectStatus.test.ts:79`) — a one-file copy + priority fix, no contract change.
- **R3:** Sam wanted duplicate-frames label and bundle-dirty status in Batch 1 (DESIGN.md toolbar rule; Riley trust). Jordan pushed palette Shading/Filters hiding to Batch 2 — critique already deferred unless Casey tests fail. Workshop kit (E2-014) stays Batch 3: `teacher-guide.md` and `docs/workshop/templates/README.md` exist; printable PDF is facilitator-facing, not app-blocking.
- **R4:** RICE ranks Batch 1 first (P0 + trust). Sam would promote workshop kit if Morgan is a launch persona, but accepts documented caveat for v1 Linux. Risk matrix: Batch 1 is high-impact/low-risk; palette progressive disclosure is medium risk of Riley discoverability regression.

## Batched tasks

### Batch 1 — Must ship (release blockers & trust)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Wire "Save, then continue" into `App.tsx` route guard — pass `onSave`/`canSave` to `UnsavedChangesDialog`, reuse `useProjectFileActions` save-before-nav (`handleSaveBeforeNavigation` pattern) so Editor → Import matches File → New/Open | frontend | P0 data-loss risk: route guard only offers Discard / Keep editing today | — |
| B1-02 | Add E2E coverage: paint → trigger import from editor → dialog shows "Save, then continue" → save succeeds → wizard opens with work persisted (`e2e/routing.spec.ts` or new case) | frontend | Locks P0 regression; existing routing tests only cover File menu Cancel path | B1-01 |
| B1-03 | Surface `bundleDirty` in status bar when pixels synced but bundle file stale — new copy in `copy.ts`, extend `deriveProjectStatus` priority between unsaved and saved; update `projectStatus.test.ts` | frontend | P1 trust gap: header dot alone; users see "All changes saved" while bundle needs Save/Save As | — |
| B1-04 | Add visible text label to duplicate-frames control on `LeftToolRail` (match other tools: icon + abbreviated copy per DESIGN.md) | frontend | P1 accessibility: icon-only violates toolbar spec; Morgan projector readability | — |

### Batch 2 — Should ship (persona polish, pre-release if capacity)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Auto-focus canvas on editor entry after project load — `tabIndex` + `focus()` in `Canvas.tsx` or `EditorPage` once grid ready (UX.md Flow 1) | frontend | P1 Riley first-pixel speed; no backend | — |
| B2-02 | Palette section rail: show abbreviated text labels at `≥1024px` in `PaletteSectionRail.tsx` (keep icon-only below breakpoint) | frontend | P1/P2 Morgan classroom; critique suggestion #2 | — |
| B2-03 | Animation player responsive layout — allow wrap/stack or collapse onion opacity row below ~1200px in `AnimationPlayer.tsx` | frontend | P1 density when onion skin + boomerang expanded | — |
| B2-04 | Casey progressive disclosure: default palette to Swatches on import entry; tuck Shading/Filters behind "More tools" expander (session flag, no API) | frontend | P1 palette cognitive load; critique unresolved tension — ship behind expander not hard hide | — |
| B2-05 | Zoom shortcuts: implement `+`/`-`/fit keyboard handlers in `shortcuts.ts` **or** remove placeholder rows from `ShortcutsOverlay.tsx` — do not ship "—" keys | frontend | P1 keyboard parity; Jordan: overlay-only fix is worse than defer | — |

### Batch 3 — Could (documented caveats acceptable for v1)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Workshop teacher kit E2-014 — printable PDF handout + facilitator one-pager linking `docs/workshop/templates/` examples | frontend | Morgan persona caveat; `teacher-guide.md` exists but kit not shipped per BACKLOG | — |
| B3-02 | Brand/installer assets — favicon set, app icons, logo lockups per DESIGN.md checklist | frontend | P2 desktop install polish; no editor behavior change | — |
| B3-03 | New project page — increase prominence of "Open existing" for Morgan template distribution (`NewProjectPage.tsx`) | frontend | P2 facilitator flow; low effort | — |
| B3-04 | Doc drift: align UX.md onboarding step count (3 vs 4 in `SkippableOverlay.tsx`) | frontend | P2 harmless consistency | — |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 0 | 4 | 0 | 4 |
| Batch 2 | 0 | 5 | 0 | 5 |
| Batch 3 | 0 | 4 | 0 | 4 |

**Explicitly deferred (not in batches):**

- New project screen three equal-weight entry paths (DESIGN.md vs two-card layout) — critique accepted as progressive disclosure
- Palette Shading/Filters hard-hide until v1.1 unless Casey usability tests show bounce
- Windows desktop shell, code signing, snap/flatpak (BACKLOG post-v1)

**Contract / DB impact:** None for all batches. No `contracts/openapi.yaml` or migration changes required.

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 800 | 2 | 85 | 0.75 | 1813 | 1 |
| Batch 2 | 600 | 1 | 70 | 1.5 | 280 | 2 |
| Batch 3 | 120 | 1.5 | 65 | 1.25 | 125 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where `Confidence` is expressed as a decimal (e.g. 85% → 0.85).

**RICE notes:**

- Batch 1 wins decisively: P0 affects every editor session with unsaved work; effort is low because `UnsavedChangesDialog` already supports save props and `useProjectFileActions` is instantiated in `App.tsx`.
- Sam would promote B3-01 (workshop kit) to Batch 2 if marketing positions Morgan at launch — current call: document caveat in release notes and ship kit in Batch 3.
- Batch 2 confidence is lower due to B2-04 (palette UX tension) and B2-05 (implement-vs-remove zoom decision).

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 82 | 22 | high impact / low risk | Reuse existing save path; extend unit + E2E tests before merge |
| Batch 2 | 58 | 38 | measurable UX win / limited blast radius | Ship B2-04 behind expander; visual regression on animation strip at 1024–1200px |
| Batch 3 | 42 | 18 | nice-to-have / well-understood | Release notes link `teacher-guide.md`; brand assets tracked in DESIGN checklist |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │        │
 50 │     │ HI/LR  │  Batch 2
 25 │ LI/LR │      │  Batch 3
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
         Batch 1 ●
```

## Decisions & open questions

### Agreed

- Batch 1 is shippable without Batch 2; no backend or OpenAPI work in this loop.
- P0 route guard is a release blocker; fixing via shared `useProjectFileActions` pattern, not a parallel save implementation.
- Bundle-dirty status bar copy is Batch 1 (user-visible trust), not deferred.
- Workshop kit absence is acceptable for v1 Linux if documented; not Batch 1.
- Palette Shading/Filters hard-hide deferred to v1.1 per critique tension resolution.

### Deferred

- DESIGN.md three equal new-project entry paths
- Windows shell and distribution signing
- Hard-hiding palette power tabs without usability evidence

### Open questions

- **B2-05:** Implement zoom keyboard shortcuts (`+`, `-`, `0` fit) vs remove VIEW_ROWS placeholders — product preference before implementation?
- **B3-01:** Is Morgan a named launch persona for v1 press/workshop, which would promote teacher kit to Batch 2?
- **B1-01:** Should `App.tsx` delegate entirely to `projectFileActions.dialogs` for route guard (single dialog instance) vs duplicate dialog with shared handlers?

## Recommended next action

Implement **Batch 1** first, owned by **frontend**: start with **B1-01** (route guard save path in `App.tsx` by wiring `UnsavedChangesDialog` to `projectFileActions` save handlers already returned by the hook), then **B1-02** E2E, then parallel **B1-03** and **B1-04**. Success for the next loop iteration: Editor → Import with dirty pixels offers "Save, then continue" and persists work; status bar distinguishes synced-but-not-saved-to-disk; duplicate-frames shows icon + label; all existing `e2e/smoke.spec.ts` and `e2e/routing.spec.ts` pass plus new save-on-route-guard case.
