# Product Direction — Select Tool + Copy/Paste

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (pixel artist in flow) |
| **Teams convened** | Design (Maya, Leo) / Strategy (Sam, Jordan) — both |
| **Upstream artifacts** | `.cursor/changelog/editor/20260803T003200_uxui-design-critique/uxui_design_critique.md` (pending), `.cursor/changelog/editor/20260803T003200_product-refinement/loop-backlog.md` (pending) |

## Product vision

Pixelanea's canvas is where ideas land — selection and clipboard are table stakes for any serious pixel workflow. Riley should be able to grab a region, duplicate it elsewhere, and undo the whole operation without leaving the canvas or breaking flow. Selection stays lightweight: drag to define, modifiers for shape, then copy/paste with a clear ghost placement step before pixels commit. Chrome stays quiet; the marching-ants overlay and status hints do the talking.

## Chair brief

**Product question:** How do we ship region selection (rect, square, circle) and copy/paste with move-then-confirm placement, integrated with undo, without bloating the tool rail or breaking playback/readOnly?

**Primary persona:** Riley — iterates fast, relies on keyboard shortcuts, expects undo to just work.

**Success looks like:**
- Drag-select on mouse release commits a visible selection.
- Shift constrains to square; Shift+C draws a circle/ellipse region.
- Copy stores selection; Paste enters placement mode — user drags to position, confirms to commit, Escape cancels.
- Ctrl+Z undoes paste as a single atomic action.
- No interaction during animation playback (readOnly).

**Constraints:** local-first, canvas hero, Tool + Command plugin model, copy strings in content/, confirm dialogs sparingly (paste confirm is inline on canvas, not a modal).

**Teams convened:** Design + Strategy (parallel)

---

## Synthesis

### Aligned

- **Selection is a mode, not a mutation.** Dragging defines a region; pixels are not changed until copy/cut/paste. Selection state lives in the editor store, not tool-local refs that vanish on tool switch.
- **Paste is a two-phase interaction:** (1) floating preview anchored to cursor/origin, moveable; (2) confirm commits via PaintCellsCommand. Cancel/Escape discards preview without undo entry.
- **Undo covers commit only.** Placement preview is ephemeral; one undo step reverts the entire pasted region to pre-paste pixel values.
- **Visual feedback:** dashed marching-ants border on selection; semi-transparent preview during paste. Status bar shows modifier hints and paste-mode instructions.
- **Tool rail:** add Select tool with icon + label (Select), shortcut **M**. Register in registry.ts, LeftToolRail, shortcuts.ts.
- **Copy/paste shortcuts:** Ctrl+C / Ctrl+V (Cmd on Mac). Cut (Ctrl+X) is P1.
- **readOnly:** all selection/copy/paste disabled during playback.

### Tensions and product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| Modal confirm vs inline confirm for paste | Design wants inline; user said confirm | **Inline confirm** — Enter or primary click; no dialog | Canvas is hero; user intent is placement control |
| Circle = perfect circle vs ellipse | User said circle; Shift means square | **Shift+C = ellipse inscribed in drag bbox** | Circle is special case when bbox is square |
| Keep selection after paste? | Design: yes; Strategy: simpler to clear | **Clear selection after paste**; clipboard retains data | Less clutter; Ctrl+V again starts fresh placement |
| Cut deletes source pixels? | Strategy: adds complexity | **Defer cut to P1** | Copy+paste delivers core job |
| Select on mouse release vs live update | User specified release | **Live preview while dragging; commits on pointer up** | Standard marquee UX |

### Decisions

**We will (P0)**

1. Select tool — drag preview; pointer up commits selection (rect, square with Shift, ellipse with Shift+C).
2. Selection overlay — dashed border on canvas.
3. Copy (Ctrl+C) — internal clipboard with palette indices.
4. Paste mode (Ctrl+V) — move preview; Enter or click commits; Escape cancels.
5. PasteCellsCommand — single undo step for full paste.
6. Shortcut M for select; status bar hints for modifiers and paste mode.
7. Unit tests for geometry and paste command.

**We will not (this loop)**

- Cut, move-without-copy, multi-selection, cross-frame clipboard, OS clipboard, transform handles, arrow-key nudge (all P1/P2).

---

## Outcomes

| Priority | Outcome | Owner hint |
|----------|---------|------------|
| P0 | Select tool: rect, square (Shift), ellipse (Shift+C) | eng |
| P0 | Copy + paste preview + inline confirm + undo | eng |
| P0 | Tool rail + shortcuts + status hints | eng |
| P0 | readOnly guard | eng |
| P1 | Cut, arrow nudge, paste-again | eng |
| P2 | OS clipboard / PNG export | eng |

---

## Recommended next action

Invoke **AGENT-recursive-implementer** with this document as spec. Ship as one batch: rect/square/ellipse select, copy, paste preview with confirm, undo.

**Acceptance criteria:**
1. M activates Select; drag commits selection with dashed border.
2. Shift = square; Shift+C = ellipse.
3. Ctrl+C copies; Ctrl+V paste mode; Enter commits; Escape cancels.
4. Ctrl+Z reverts paste in one step.
5. readOnly disables all selection/clipboard actions.

---

## Open questions

- Transparent pixels on paste: **overwrite** destination (stamp semantics).
- Re-select replaces previous selection: **yes**.
- Use BoxSelect or SquareDashed icon — distinct from frame duplicate Copy icon.
