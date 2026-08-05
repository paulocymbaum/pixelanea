# UX/UI Design Critique — Canvas Viewport Performance (Zoom / Pan / Paint)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-05 |
| **Target** | Canvas viewport interactions — `Canvas.tsx`, `useCanvasRenderState.ts`, `renderer.ts`, `viewportStore.ts`, `coordinates.ts`, `useSelectionOutlineOverlay.ts`, `ZoomControls.tsx` |
| **Persona** | Riley (Hobby Game Dev — primary) |
| **Scope** | Implemented |

## Job statement

When I am blocking out sprite art at 32×48, I want zoom and pan to feel as immediate as painting, so I can inspect pixel edges and keep creative flow without the canvas fighting me.

## Golden path

Open project → fit-to-view canvas → scroll-wheel zoom to cursor on detail area → switch to hand (H) → pan to adjacent limb → switch to pencil → paint stroke with live preview → scroll zoom out to check silhouette → continue frame duplication workflow.

## Dialogue summary

**Maya:** Riley's job is pixel-level inspection interleaved with fast painting. UX.md promises "Paint: instant feedback, no lag" and "Zoom: scroll / shortcuts; grid at ≥8×." Stroke preview already uses RAF coalescing and dirty-cell repaint — but wheel zoom and hand-pan call `setViewport` on every event with no coalescing (`Canvas.tsx` L160–174, L207–214). Each viewport tick recreates `redraw` and triggers `useEffect` → full `renderGrid()` — O(grid cells) every frame. Riley will feel paint as butter and navigation as stutter.

**Leo:** Visually the architecture is right: canvas hero, checkerboard functional tokens, marching ants on overlay (`useSelectionOutlineOverlay.ts`). But we're repainting the entire grid — checkerboard, all pixels, grid lines at zoom ≥8 — on every pan pixel. At 16× zoom on a 48×48 sprite, `drawGridLines` alone strokes ~98 lines per frame. The overlay also redraws on pan/zoom (`useSelectionOutlineOverlay.ts` L128–133). Two canvases doing work per move.

**Maya:** Zoom-to-cursor math is correct (`zoomAtPoint` in `coordinates.ts`), but `ZOOM_STEP` (1.25) on every wheel tick means discrete jumps — fine for buttons, harsh for continuous scroll. Worse: wheel anchors to cursor; `ZoomControls` and `+`/`-` shortcuts anchor to viewport center (`ZoomControls.tsx` L17–20, `shortcuts.ts` L260–263). Riley zooms into a character's eye with scroll, then hits `+` and the view lurches to center — spatial continuity breaks (ux-seamless-flows mistake #4, practice #4).

**Leo:** Zoom chrome placement is good — bottom-right, `bg-elevated/95`, mono percent, `aria-live="polite"`. Hand tool cursor `grab`/`grabbing` is correct (`Canvas.tsx` L361–364). Gap: DESIGN.md lists StatusBar with "Coords, zoom" but `StatusBar.tsx` only shows hover cell — zoom is siloed in the corner overlay. During heavy jank Riley can't tell if lag is "the app" or "I've hit zoom limits" (`ZOOM_MAX` 32).

**Maya:** Edge case — Riley selects a region, marching ants animate on overlay RAF (good, respects `prefers-reduced-motion`). Pan/zoom during selection triggers main canvas full repaint *and* overlay reposition every frame. Painting with active color filters forces full `drawFilterPreview` per redraw — no partial path. Onion skin adds another full `drawPixels` pass.

**Leo:** At high zoom, `drawCheckerCell` paints 8×8 checker sub-rects per pixel cell (`renderer.ts` L172–185) — visually correct for transparency, expensive during pan. Grid lines appearing at `GRID_LINE_MIN_ZOOM = 8` is the right DESIGN threshold but the transition is a cliff: crossing 8× suddenly adds full-grid line work.

**Convergence:** P0 = coalesce viewport updates + decouple pan/zoom from full grid repaint. P1 = anchor consistency, grid-line threshold smoothing, zoom feedback in status chrome. P2 = CSS transform preview during gesture, checkerboard layer cache.

## Findings

### Critical (P0) — blocks task completion or trust

- **Asymmetric smoothness breaks flow contract.** Painting uses RAF-coalesced partial `repaintGridCells` (`useCanvasRenderState.ts` L143, L399–407); pan and wheel zoom do not (`Canvas.tsx` L174, L209–213). Riley experiences reliable stroke preview but unreliable navigation — violates UX.md "instant feedback" for half the core loop.
- **Full `renderGrid()` on every viewport delta.** `redraw` depends on `zoom`/`panX`/`panY`; viewport-driven callback identity change fires `useEffect` → `renderGrid()` with `clearRect`, full checkerboard, all pixels, optional onion skin, grid lines, filter preview (`useCanvasRenderState.ts` L417–425, `renderer.ts` L496–591). On typical Riley grids (32×32–64×64) this produces dropped frames during continuous wheel or drag.
- **Dual-canvas work during navigation with selection.** Main grid full repaint plus overlay `drawOutline` on every pan/zoom change (`useSelectionOutlineOverlay.ts` L128–133) compounds jank when marching ants are the visual anchor Riley tracks.

### Warnings (P1) — meaningful friction or inconsistency

- **Zoom anchor inconsistency disorients.** Scroll wheel zooms toward cursor (`Canvas.tsx` L162–173); toolbar buttons and `+`/`-` zoom toward viewport center (`ZoomControls.tsx`, `shortcuts.ts`). Switching input methods shifts the focal point without warning.
- **Stepped wheel zoom feels mechanical.** Fixed `ZOOM_STEP` (1.25) per wheel event (`coordinates.ts` L4) — no accumulation or smooth scaling — reads as "clicky" rather than optical zoom, especially on trackpads emitting many small deltas.
- **Grid-line cliff at 8×.** `GRID_LINE_MIN_ZOOM = 8` toggles full `drawGridLines` (`renderer.ts` L311–313). Crossing the threshold adds a large per-frame cost exactly when Riley zooms in to edit pixels — the moment precision matters most.
- **Zoom state hidden from status chrome.** Percent lives only in bottom-right `ZoomControls`; `StatusBar.tsx` omits zoom despite DESIGN.md shell spec. During performance stress Riley lacks a stable reference for "where am I in magnification."
- **Hand-tool-only pan.** Pan requires active hand tool (`Canvas.tsx` L207–214, L237–245). No spacebar temporary pan — common in creative tools; Riley painting with pencil must switch tools to reposition, breaking flow.

### Suggestions (P2) — polish and delight

- **No gesture-end settle.** Pan/zoom stops abruptly with no micro-settle or snap feedback; acceptable for v1 but misses practice #6 proportional feedback opportunity.
- **Zoom percent rounding.** `formatZoomPercent` rounds (`coordinates.ts` L116–117) — fine at 100%, can jump oddly between steps at high zoom (e.g. 1597% vs 1600%).
- **Fit-to-view on grid resize** recenters without preserving user's prior zoom intent (`Canvas.tsx` L129–152) — correct for dimension change, but no toast or status hint when viewport jumps.

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — Paint/zoom paths exist; performance makes zoom feel secondary-quality
- [ ] State visible (loading/saved/error)? — Zoom % visible in corner; not in status bar; no perf/degraded indicator
- [x] Modals justified? — N/A for viewport
- [ ] Patterns consistent? — Zoom anchor differs by input method
- [x] Overwhelming on first visit? — Zoom controls appropriately minimal
- [ ] Edge cases designed? — High zoom + grid lines + selection + filters = compounding cost un surfaced to user
- [x] Hierarchy matches priority? — Canvas hero, chrome recedes (`DESIGN.md`)
- [ ] Beauty serves clarity? — Checkerboard fidelity at high zoom costs clarity of interaction smoothness

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ⚠️ | Paint path optimized; navigate path is golden-path blocker at scale |
| One decision per step | ✅ | Zoom vs pan vs paint are distinct modes |
| Progressive disclosure | ✅ | Grid lines only at ≥8×; frame strip when needed |
| Immediate feedback | ❌ | Stroke <100ms perceived; pan/zoom often >100ms on full repaint |
| Forgiving (undo/autosave) | ✅ | Unaffected by viewport perf |
| Visual hierarchy | ✅ | Canvas ≥60%, zoom chrome bottom-right |
| Flow tested end-to-end | ⚠️ | Zoom-to-edit-to-paint loop degrades on 48×48+ at ≥8× |

## Agreed recommendations

1. **RAF-coalesce viewport updates during wheel and pan gestures** — batch `setViewport` to one update per animation frame, mirroring stroke `scheduleRedraw`. *Owner: eng · Effort: S · Feel: eliminates event flood; single repaint per frame.*

2. **CSS `transform` on canvas wrapper during active pan/zoom gesture; commit to store on `pointerup` / wheel idle** — visual motion at compositor speed; one `renderGrid()` when gesture ends. *Owner: eng · Effort: M · Feel: pan becomes "locked to finger"; zoom-to-cursor stays stable during gesture; Riley perceives 60fps motion even if pixel buffer repaints once.*

3. **Dirty-region or translate-blit repaint for pan-only changes** — when zoom unchanged, shift backing buffer by delta and repaint exposed strips instead of full O(n²) `drawPixels`. *Owner: eng · Effort: L · Feel: hand-drag matches pro editor expectations; largest win for 64×64+ grids.*

4. **Unify zoom anchor to cursor/focal point across wheel, buttons, and shortcuts** — pass pointer position or last canvas hover cell as anchor for `zoomIn`/`zoomOut`. *Owner: ux/eng · Effort: S · Feel: no lurch when switching from scroll to `+`; preserves spatial continuity (practice #4).*

5. **Defer or simplify grid lines during active viewport gesture** — hide lines while `isPanning` or wheel debounce active; redraw lines on settle. *Owner: ui/eng · Effort: S · Feel: removes cliff at 8× during motion; lines return when Riley needs alignment.*

6. **Surface zoom in StatusBar** (per DESIGN.md) — mono percent beside hover coords; optional brief "Fit" flash on `0` key. *Owner: ui · Effort: S · Feel: stable magnification reference during jank; reinforces trust.*

7. **Cache static checkerboard layer** (offscreen canvas or ImageBitmap) invalidated only on theme/zoom-tier change. *Owner: eng · Effort: M · Feel: reduces shimmer and CPU on pan; checker stays crisp without per-cell loops at high zoom.*

## How optimizations affect perceived feel

| Optimization | Riley would feel… |
|--------------|-------------------|
| **RAF coalescing** | Wheel and drag stop "skipping" — motion catches up to input one frame behind, similar to stroke preview. |
| **CSS transform during gesture** | Immediate finger-tracking pan/zoom; canvas "sticks" to pointer; brief crisp snap when released. Trust increases even if final repaint takes one frame. |
| **Dirty regions / translate-blit** | Sustained 60fps pan on larger sprites; less fan noise; paint-after-pan has no offset drift. |
| **Unified zoom anchor** | Inspecting an eye, hitting `+`, eye stays centered — no "where did my art go?" moment. |
| **Deferred grid lines** | Smoother zoom into pixel-edit range; lines pop in when motion stops — acceptable trade if brief. |
| **Checkerboard cache** | Less visual "swimming" of checker pattern during pan; art feels glued to the surface. |

## Unresolved tension

**Maya** wants spacebar temporary pan (industry standard, fewer tool switches). **Leo** worries an invisible mode overlay complicates cursor state and conflicts with keyboard shortcuts for colors 1–9. **Defer to product call** — recommend user testing with Riley persona; P2 until validated.

**Leo** prefers hiding grid lines during gesture. **Maya** notes Riley uses lines as alignment guides while zooming into seams. Compromise: fade lines to 30% opacity during gesture rather than remove — recorded as optional P2.

## Files reviewed

- `apps/web/src/canvas/Canvas.tsx`
- `apps/web/src/canvas/useCanvasRenderState.ts`
- `apps/web/src/canvas/renderer.ts`
- `apps/web/src/state/viewportStore.ts`
- `apps/web/src/canvas/coordinates.ts`
- `apps/web/src/canvas/useSelectionOutlineOverlay.ts`
- `apps/web/src/canvas/ZoomControls.tsx`
- `apps/web/src/state/shortcuts.ts` (zoom key handlers)
- `apps/web/src/shell/StatusBar.tsx`
- `UX.md` (Riley persona, interaction patterns, canvas sovereignty)
- `DESIGN.md` (canvas tokens, zoom range, grid-line rule, shell layout)

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — mistakes #4, #7, #11; practices #4, #6, #10
- `UX.md` — Riley jobs-to-be-done; "Paint: instant feedback"; "Zoom: scroll / shortcuts; grid at ≥8×"; canvas sovereignty
- `DESIGN.md` — canvas hero ≥60%; zoom 25%–3200%; grid lines at ≥8×; checkerboard functional tokens; StatusBar zoom spec
