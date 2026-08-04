# Product Direction — Select Tool Revamp v1

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-04 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (primary) — frame nudge / walk-cycle workflow |
| **Teams convened** | Design (Maya, Leo) + Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/editor/20260804T051300_uxui-design-critique/uxui_design_critique.md`, `.cursor/changelog/editor/20260804T051300_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea wins when the canvas stays fast and the next action is obvious. The select tool is how Riley nudges a leg across eight frames and how Morgan’s students learn edit-without-fear — but today it hides copy, cut, and paste behind keyboard shortcuts and forces cut→paste just to move pixels. **Select revamp v1** makes selection feel like a native creative gesture: marquee, floating actions under the bbox, and drag-to-move with one undo step. Chrome recedes; the grid stays the hero. Heavy compute moves to C++ in a follow-up batch only after client-side render fixes prove the interaction model — we ship feel first, offload second.

## Chair brief

**Product question:** What should we ship this loop for the select tool performance + UX revamp, and what do we defer?

**Primary persona:** Riley — “nudge this eye three pixels left” across animation frames.

**Success looks like:** Select → floating bar appears → Move (or drag inside selection) → undo works; Copy/Cut/Paste discoverable without opening `?`; no full-grid repaint every frame while a selection is active.

**Constraints:** Local-first (client pixels authoritative during edit); canvas hero; layer boundaries (`domain/` pure, UI→API→contract); no OS clipboard, multi-select, or resize handles this loop.

**Teams convened:** Design + Strategy (parallel).

## Synthesis

### Aligned

- **Move is the anchor feature** — not C++ offload. Without labeled move, the floating bar has no primary action.
- **Batch 1 ships without OpenAPI changes** — client render perf + `MoveSelectionCommand` + `SelectionActionBar`.
- **Partial repaint before C++** — extend `repaintGridCells` (strokes already use it); stop full-grid RAF for marching ants.
- **Bar spec is settled** — 8px below bbox, flip above near frame strip; `ZoomControls` tokens; paste-active variant (Place | Cancel).
- **Scope cuts are explicit** — no resize handles, OS clipboard, multi-select, transforms, Edit menu duplication, dimension readout, or blocking modals.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| C++ compute in same loop vs deferred | Jordan: defer to Batch 2; Sam: don’t block bar on API | **Defer C++ to Batch 2** | Riley’s typical grids (32×48) are smooth after partial repaint; C++ adds contract + sync risk without user-visible story in v1. |
| Paste Place/Cancel in Batch 1 vs Batch 2 | Sam: fold into bar if possible; Jordan: P1 polish | **Ship paste-active bar variant in Batch 1** | Low cost once bar shell exists; Casey onboarding friction is measurable. |
| Marching ants: animate vs static | Leo: static during drag; Jordan: overlay canvas | **Static outline during move/drag; overlay or static dash otherwise** | Decorative animation competes with perf; motion is not the job. |
| Cut outline after cut | Maya: confuses Morgan; Jordan: P1 slip | **P1 in Batch 2** | Don’t block move + bar on cut-state polish. |
| Icon-only vs icon+label on bar | Leo: icons default; Maya: labels when bbox ≥120px | **Icons default; text labels when selection width ≥120px** | Workshop touch targets + progressive disclosure. |

### Decisions

**We will (Batch 1 — select revamp v1)**

- Add `SelectionActionBar` under selection bbox (default + paste-active variants).
- Implement move-selection: drag inside bbox or Move button → preview → single undo commit.
- Fix render perf: no full-grid RAF for selection overlay; partial `repaintGridCells` for paste/move preview.
- Hide bar during `readOnly` / playback; disable Paste when clipboard empty.
- Add status-bar feedback for ops >100ms (“Copying…” / “Moving…”).

**We will not (this loop)**

- `POST /api/compute/selection` or domain `selection_ops` (Batch 2).
- Resize handles, OS clipboard, multi-select, transforms, duplicate-in-place, dimension readout.
- Edit menu mirroring of selection actions.
- Blocking modals for large selections.
- Frontend adoption of `PATCH /cells` for this feature.

**We will (Batch 2 — after v1 lands)**

- C++ compute endpoint + threshold-based offload for large selections (Alex / 128×128).
- Cut-outline clarity after cut; persistent clipboard indicator.
- Dogfood gate: promote C++ only if profiling shows >100ms on 64×64 after Batch 1.

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Move selection (drag + bar) with single undo step | eng | design + strategy |
| P0 | `SelectionActionBar` under bbox (Move/Copy/Cut/Paste/Deselect) | eng + ui | design |
| P0 | Partial repaint for paste/move preview; no full-grid ants RAF | eng | design + strategy |
| P0 | Paste-active bar variant (Place / Cancel) | eng + ui | design |
| P1 | Status feedback for ops >100ms | eng | design |
| P1 | C++ `POST /api/compute/selection` offload | eng (Batch 2) | strategy |
| P1 | Cut state clarity + clipboard indicator | eng + ui (Batch 2) | design |
| P2 | Arrow-key nudge selection, duplicate-in-place, deselect affordance polish | eng (Batch 3) | design |

## Recommended next action

Invoke **AGENT-recursive-implementer** (or `skill-implementer`) on **Batch 1 only**: B1-01 overlay/static selection outline → B1-02 partial repaint → B1-03 `MoveSelectionCommand` → B1-04 `selectTool` drag-inside-bbox → B1-05 `SelectionActionBar` → B1-06 paste-active variant → B1-07 tests. **No OpenAPI change in this loop.** Success metric: Riley can drag-move a 32×32 selection at ≥60fps feel without cut→paste; Morgan can complete copy/paste using only on-canvas controls. After Batch 1 merges, run a 15-minute dogfood on 64×64 and 128×128 grids before opening Batch 2 C++ work.

## Open questions

- Does Morgan’s workshop pilot date force E2E Gherkin for select bar into Batch 2 instead of Batch 3?
- Overlay canvas vs static dash on main canvas — implementer picks lowest-risk path; revisit if HiDPI outline drifts.
- Threshold for C++ offload (64 cells vs area-based) — decide during Batch 2 profiling, not now.
