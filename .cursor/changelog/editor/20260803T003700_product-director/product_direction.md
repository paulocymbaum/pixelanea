# Product Direction — Select Tool + Copy/Paste with Floating Paste Preview

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Session type** | Product review |
| **Feature area** | editor |
| **Primary persona** | Riley (hobby game dev — walk-cycle duplication) |
| **Teams convened** | Design (Maya, Leo) + Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/editor/20260803T003500_uxui-design-critique/uxui_design_critique.md`, `.cursor/changelog/editor/20260803T003240_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea earns Riley's trust when duplicating sprite work feels as natural as painting. Select + copy/paste closes the biggest gap in the walk-cycle workflow: reposition a limb or face tile across frames without repainting or duplicating entire frames. The canvas stays hero — selection chrome and paste preview live on the viewport layer; commit happens only through an explicit **Place** action (placement bar + Enter), never a modal or accidental click. This loop ships frontend-only, preserves palette-index fidelity, and folds into the existing Tool + Command architecture so undo stays one step per paste and playback remains read-only.

## Chair brief

**Product question:** What do we ship for Select + Copy/Paste, in what order, and with what UX contract — so Riley can duplicate pixel regions across frames with confidence and undo safety?

**Primary persona:** Riley (primary); Casey and Morgan benefit from labeled tools and explicit Place/Cancel; Alex needs palette-index paste and cell coords during placement.

**Success looks like:** Drag-rect select on release → copy → floating preview → move → Place → one undo step; Shift modifiers and ellipse in a fast follow; no edits during playback; no backend changes.

**Constraints:** Local-first; canvas hero; Tool + Command plugin model; `readOnly` during playback; confirm dialogs sparingly (paste confirm is the approved exception via placement bar, not modal); session clipboard (not OS clipboard in v1); copy strings in `content/copy.ts`.

**Teams convened:** Design + Strategy (parallel)

## Synthesis

### Aligned

- **End-to-end job:** Select region → copy → reposition preview → confirm → undo/redo. Rect alone covers ~80% of Riley's duplicate-region cases; square/ellipse are P1 parity with the user brief.
- **Architecture:** Frontend-only. New `selectTool` + store slices for selection/clipboard/paste preview. Paste confirm dispatches one `PaintCellsCommand` (or thin wrapper) — single undo entry.
- **Visual model:** Canvas-rendered selection overlay (dashed rubber band while dragging; static dashed border after release in P0). Paste preview via `previewCells` pattern at ~85% opacity; canvas dimmed outside ghost during place mode.
- **Chrome:** Select tool in rail after Line, before Hand (`SquareDashed` icon — never reuse `Copy`, which is frame duplicate). Shortcut **S** for Select; **Ctrl/Cmd+C/V** for copy/paste.
- **Placement bar:** Canvas-adjacent bar (above frame strip) with primary **Place** and ghost **Cancel**; Enter/Esc keyboard parity. Status bar shows mode-driven hints.
- **Guards:** `readOnly` blocks select/copy/paste; active paste preview cancels on Play, frame switch, or tool change — never auto-commits. Empty selection copy → status hint, no toast-only.
- **Clipboard:** In-memory, palette-index relative coords; persists across frame switches (copy frame 1 → paste frame 2 is in scope for P0). Transparent cells included as index 0.
- **Deferred:** Cut, OS clipboard, additive multi-select, move-tool semantics, resize handles, Ctrl+D duplicate-in-place.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| Select tool shortcut **S** vs **V** | Design → S; Strategy → V | **S** | Mnemonic, unused in `shortcuts.ts`. **V** is not needed for paste (Ctrl+V). Avoids future tool-key collision. |
| Paste confirm: canvas click vs Place/Enter only | Design → Place/Enter only; Strategy → click or Enter | **Place bar + Enter only** | Mis-click at pixel scale is costly; placement bar is the explicit primary action Morgan/Casey need. Pointer move repositions; canvas click does **not** commit. |
| Selection persists on tool switch? | Design → clear; Strategy → keep | **Clear on tool switch (v1)** | Predictable overlay lifecycle; re-select is cheap. Revisit "pinned selection" if user testing shows Eyedropper friction. |
| Batch 1 includes paste or split copy/paste? | User brief implied 3 batches; Strategy → paste in B1 | **Paste preview + confirm in P0 Batch 1** | Copy without paste is not shippable value; RICE winner is the full golden path in one batch. |
| Marching ants animation | Design → yes (reduced-motion fallback); Strategy → defer | **Static dashed border P0; marching ants P1 polish** | Ships faster; animation is delight, not blocker. |
| Cross-frame paste | Design → cancel preview on frame switch; Strategy → clipboard is global | **Cancel active paste preview on frame switch; clipboard persists** | Riley copies on frame N, switches, Ctrl+V on frame M — preview restarts, clipboard intact. |
| Paste overwrites vs merge transparent | Open in both | **Overwrite destination cells; transparent clipboard cells write index 0** | Simple, predictable; merge policy deferred to P2. |

### Decisions

**We will**

- Ship **Batch 1 (P0):** Rectangular select on release, in-memory clipboard, Ctrl+C/V, floating paste preview, placement bar (Place/Cancel), Enter/Esc, single-step undo/redo, readOnly guards, tool rail + **S** shortcut, unit tests for bounds/clipboard/command.
- Ship **Batch 2 (P1)** immediately after B1 merges: Shift → square, Shift+C → ellipse, live modifier preview, status/shortcuts overlay hints.
- Use session clipboard with relative `{ dx, dy, index }[]` encoding; palette indices preserved.
- Clip off-grid paste cells silently on confirm.
- Disable hand pan while paste mode is active (paste owns pointer).

**We will not (this loop)**

- Cut (Ctrl+X), OS/system clipboard, or PNG export.
- Modal paste confirm dialog.
- Canvas-click-to-commit paste.
- Multi-selection, selection resize handles, or true move-tool (delete-on-drag).
- Backend/OpenAPI changes.
- Selection persistence across tool switches (v1).

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Rect select tool (`selectTool.ts`) with drag preview and dashed marquee on release | eng | strategy |
| P0 | `editorStore` selection + clipboard + pastePreview slices | eng | strategy |
| P0 | Extend `useToolInput.ts` for drag-with-move (select + paste reposition) | eng | strategy |
| P0 | Canvas selection overlay + paste preview rendering (`previewCells` / renderer pass) | eng | both |
| P0 | Placement bar UI (Place/Cancel) + status bar mode hints + `copy.ts` strings | eng + ux | design |
| P0 | `PasteCellsCommand` / `PaintCellsCommand` batch on confirm; one undo step | eng | both |
| P0 | Shortcuts: S, Ctrl/Cmd+C/V, Enter place, Esc cancel; `ShortcutsOverlay` entries | eng | both |
| P0 | `readOnly` / playback cancel; frame-switch cancels preview, keeps clipboard | eng | design |
| P0 | Select in tool rail (`SquareDashed`, after Line); avoid Copy icon clash | ui | design |
| P0 | Unit tests: bounds math, clipboard encode, command apply/revert, shortcut guards | eng | strategy |
| P1 | Shift square + Shift+C ellipse selection with live preview | eng | both |
| P1 | Marching ants animation (`prefers-reduced-motion` → static dash) | eng + ui | design |
| P1 | Status/overlay hints for modifiers; ellipse edge-case tests | ux + eng | both |
| P2 | Cut, OS clipboard, arrow nudge, Ctrl+D duplicate-in-place | eng | design |

## Recommended next action

Invoke **`AGENT-recursive-implementer`** for the full P0→P1 arc (Batch 1 then Batch 2), with **`skill-implementer`** acceptable if scoping strictly to Batch 1 only in a single session. Start with store + input spine (B1-01, B1-02, B1-04), then canvas overlay (B1-03, B1-08), then paste command (B1-09), then chrome (B1-06, B1-07 placement bar, B1-11). Spike paste-preview renderer early — highest integration risk.

**Implementation batches**

| Batch | Scope | Acceptance criteria |
|-------|-------|---------------------|
| **1 — P0** | Rect select + copy + paste preview + placement bar + undo | Riley drags 16×16 rect, Ctrl+C, Ctrl+V, moves ghost, clicks **Place** (or Enter), pixels commit; Ctrl+Z reverts entire paste in one step; Esc cancels preview; select/paste blocked during playback; copy on frame 1 → switch frame → paste on frame 2 works; no server changes. |
| **2 — P1** | Shift square, Shift+C ellipse | Square drag matches max(|dx|,|dy|); ellipse rasterizes to cell mask inside bbox; modifiers update live mid-drag; copy/paste unchanged from Batch 1. |
| **3 — P2 (defer)** | Cut, OS clipboard, nudge, Ctrl+D | Not in this loop. |

**Success metric:** Riley completes walk-cycle limb reposition (copy region → paste on next frame → undo once) in under 30 seconds without leaving keyboard/mouse flow.

## Open questions

- **Edit menu:** Header Edit → Copy/Paste items in P0 or defer to P1? (Recommend P1 unless header menu already exists — shortcuts + placement bar suffice for P0.)
- **Paste anchor semantics:** Top-left of selection bbox snaps to cell under cursor vs center-anchor? (Recommend top-left of bbox at hover cell — matches pixel editor convention.)
- **Auto-return tool after paste:** Return to Select or restore prior tool? (Recommend restore prior tool if user was painting; default to Select if paste started from Select.)
- **Workshop deadline:** If demo within 2 weeks, promote Batch 2 (ellipse) to same PR as Batch 1 for visual differentiation.
