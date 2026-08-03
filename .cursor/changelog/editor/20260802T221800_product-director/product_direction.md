# Product Direction — Editor Canvas P0 (Zoom, Paint Perf, Undo)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (hobby game dev — aggressive painter, high-res grids) |
| **Secondary personas** | Morgan (classroom recovery — undo trust), Casey (import-then-cleanup) |
| **Teams convened** | Design (Maya, Leo) / Strategy (Sam, Jordan) — both |
| **Upstream artifacts** | `.cursor/changelog/editor/20260802T221700_uxui-design-critique/uxui_design_critique.md`, `.cursor/changelog/editor/20260802T221730_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea's canvas is where Riley lives — zoom, paint, and undo must feel invisible so creative flow never breaks. Three reported P0 gaps attack that promise directly: zoom that appears broken, paint that lags on large grids, and undo that covers only a slice of what users expect. We will restore canvas control in a frontend-only Loop 1 (zoom fix, stroke batching, render throttle), then expand honest, gesture-level undo in Loop 2 — without moving live painting to C++, which would violate our local-first, client-side canvas architecture. The product story stays: **make pixel art, keep it local, mistakes are cheap.**

## Chair brief

**Product question:** How do we prioritize and batch fixes for zoom failure, high-res paint lag, and incomplete undo — and what do we tell the user who asked for multithreaded C++ pixel computation?

**Primary persona:** Riley — blocks out sprites at 32×32–256×256, zooms for detail, paints aggressively, undoes often.

**Success looks like:** Wheel and toolbar zoom visibly change grid scale and persist until explicit Fit or grid-size change; a drag stroke on 128×128 feels continuous with one undo step per gesture; palette edits are undoable; users understand what Ctrl+Z covers.

**Constraints:** Local-first, canvas is hero, layer boundaries non-negotiable (interactive paint stays in browser; domain/C++ for persistence/import/export only), no OpenAPI changes for Loop 1.

**Teams convened:** Design + Strategy (parallel).

## Synthesis

### Aligned

- **All three issues are P0 trust breaks** — they violate UX.md promises ("Instant feedback, no lag", "Mistakes are cheap") and block Riley's golden path: fit → paint → zoom detail → undo.
- **Zoom is a frontend wiring/UX bug, not missing backend** — math exists in `coordinates.ts` and `editorStore.ts`; likely causes are unanchored toolbar zoom, aggressive `fitToView` on resize, and possibly passive wheel listeners. Pointer-events wrapper is low likelihood (child has `pointer-events-auto`).
- **Paint lag is confirmed frontend architecture** — per-cell `dispatch()` + full-grid `renderGrid` on every pointer-move; stroke batching and rAF throttle are the right Loop 1 fixes.
- **Undo gap is scope + granularity** — stack is pixel-`Command` only via `dispatch()`; palette, frame, and filter paths bypass it; per-cell undo makes paint feel broken even when it technically works.
- **C++ multithreading for live paint is rejected** — violates `ARCHITECTURE.md` (canvas owns interactive grid); user intent maps to frontend batching + render cache, not per-pixel API round-trips.
- **Loop 1 is frontend-only, sub-week** — zoom fix + stroke batching + rAF throttle + regression tests; RICE winner by wide margin.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| Full "everything on screen" undo vs pixel-only | Design (Maya wants full; Leo warns scope creep) / Strategy (Tier A+B MVP) | **Phased undo: Loop 1 = batched pixel strokes; Loop 2 = + palette; Loop 3 = frame ops** | Matches user report without ballooning Loop 1; honest microcopy ships with Loop 2 |
| `fitToView` on panel resize | Design (destroys zoom memory) / Strategy (Jordan: guard with flag) | **Stop auto-fit on resize; fit only on first open, explicit Fit click, or grid dimension change** | Resize should not undo deliberate zoom; store `userHasAdjustedViewport` if needed |
| Undo toolbar label "Edit history" | Design P1 | **Rename to scoped label in Loop 2** ("Undo paint" interim acceptable in Loop 1 if stroke batching lands) | Don't over-promise before palette undo ships |
| C++ multithreading user ask | Strategy rejects for live paint | **Defer; optional Batch 3 spike for `image/` import/export only** | Honors perf intent without layer violation |
| Zoom shortcuts in UX.md but not implemented | Design P1 | **Ship in Loop 1 tail or Loop 2 head** (`+`/`-`/Fit; update `ShortcutsOverlay`) | Low effort; closes pattern inconsistency |
| Perf SLO grid size | Strategy open question | **128×128 continuous stroke for Loop 1 sign-off; 256×256 target for Loop 2 dirty-region** | Riley's common sizes; 512+ is stretch |

### Decisions

**We will**

- **Loop 1 (ship next):** Fix zoom end-to-end — anchored toolbar zoom, guard `fitToView` from clobbering manual zoom, verify wheel with non-passive listener if needed, add zoom regression tests.
- **Loop 1:** Stroke-batch paint/eraser — one `PaintCellsCommand` per pointer-down→up; rAF render throttle during active stroke; paint perf smoke test.
- **Loop 2:** Dirty-region or layer-cache render for 256×256+; undo Tier A+B (batched pixels + palette commands); zoom in status bar per DESIGN.md; scoped undo microcopy.
- **Loop 3:** Frame-operation undo (Tier C); filter slider undo (Tier D); document non-undoable chrome (zoom/pan, tool switch).
- **Reject** multithreaded C++ for live interactive painting.

**We will not (this loop)**

- Add per-pixel paint API endpoints or move stroke loop to server.
- Promise undo for viewport/tool/panel chrome.
- Block Loop 1 on full editor-history architecture or C++ perf spike.
- Ship palette section rail and canvas P0 in the same PR — canvas P0 takes precedence over prior palette-rail direction when eng capacity is constrained.

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Zoom works via wheel, toolbar (anchored), and Fit — persists until explicit reset | eng | design + strategy |
| P0 | Paint stroke batching — one dispatch + one undo step per drag gesture | eng | design + strategy |
| P0 | rAF render throttle during active stroke | eng | strategy |
| P0 | Zoom + stroke perf regression tests | eng | strategy |
| P1 | Dirty-region / OffscreenCanvas render cache (256×256 SLO) | eng | strategy |
| P1 | Undo palette add/edit/remove (Tier B commands) | eng | design + strategy |
| P1 | Zoom shortcuts wired; `ShortcutsOverlay` updated | eng | design |
| P1 | Zoom % in status bar; scoped undo microcopy | ui/ux | design |
| P2 | Frame duplicate/count/reorder undo (Tier C) | eng | strategy |
| P2 | Empty-canvas hint: "Scroll to zoom" | ux | design |
| P2 | C++ multithread spike for import/export only (if benchmarks fail) | backend | strategy |

## Shippable batches

### Loop 1 — Restore canvas control (Batch 1)

| ID | Task |
|----|------|
| B1-01 | Fix zoom: anchored toolbar, `fitToView` guard, wheel listener verification |
| B1-02 | Stroke-batch paint/eraser (`PaintCellsCommand` on pointer up) |
| B1-03 | rAF render throttle during stroke |
| B1-04 | Zoom regression tests |
| B1-05 | Paint perf smoke test (≤N redraws per stroke on 64×64) |

**Exit criteria:** Wheel and toolbar zoom visibly change scale; zoom survives panel resize; 128×128 stroke feels continuous; one undo per stroke.

### Loop 2 — Render efficiency + undo MVP (Batch 2)

| ID | Task |
|----|------|
| B2-01 | Dirty-region or layer-cache render |
| B2-02 | Decouple filter preview from paint loop |
| B2-03 | Undo Tier A+B: batched pixels + palette commands |

### Loop 3 — Full history + deferred (Batch 3)

| ID | Task |
|----|------|
| B3-01 | Frame operation undo (Tier C) |
| B3-02 | Filter settings undo (Tier D) |
| B3-03 | Document non-undoable chrome in `content/` |
| B3-04 | C++ multithread spike — `image/` import/export only, if needed |

## Recommended next action

Invoke **`AGENT-recursive-implementer`** (or `skill-implementer`) on **Loop 1 / Batch 1** with this product direction and upstream artifacts. Parallel workstreams: one implementer on B1-01 (zoom), one on B1-02+B1-03 (stroke batching + rAF). After merge, run `test-matrix-unit` on zoom coordinates, paint tools, and undo stack; manual sign-off on 128×128 stroke at 1080p. Hand Loop 2 to a follow-on loop once Batch 1 exit criteria pass.

**Success metric:** Riley can zoom to 800% on a 128×128 grid, paint a 50-cell stroke without perceptible lag, and undo the entire stroke with one Ctrl+Z.

## Open questions

- Frame undo memory cap before B3-01 — product limit on frames × grid bytes per snapshot.
- Should Loop 1 include zoom shortcuts (+/−/0) or defer to Loop 2 tail? **Taylor lean:** include if <0.5 day; otherwise Loop 2.
- Relationship to in-flight palette section rail work — canvas P0 supersedes when eng is serial; parallel only if separate owners.
