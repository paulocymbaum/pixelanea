# UX/UI Design Critique — Select Tool + Copy/Paste (Floating Paste Preview)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Target** | Select tool, clipboard copy/paste, floating paste-preview placement mode |
| **Persona** | Riley (primary); Casey, Morgan, Alex |
| **Scope** | Planned feature — grounded in existing shell, tools, and canvas patterns |

## Job statement

When I am editing sprite art, I want to select a region of pixels and copy it to another position, so I can reuse shapes across poses and frames without redrawing.

## Golden path

1. Press **M** (or click **Select** in left tool rail)
2. Drag on canvas → release to commit rectangular selection (marching ants)
3. **Ctrl+C** to copy selection to internal clipboard
4. **Ctrl+V** → enter **paste placement mode** (ghost preview follows pointer)
5. Move to target position → **click** or **Enter** to commit
6. **Ctrl+Z** undoes the paste as a single operation

**Modifier branches (during step 2 drag):**

- **Shift** held → constrain to square
- **Shift+C** held → ellipse/circle selection (bounding box still axis-aligned; pixels inside ellipse)

## Dialogue summary

**Maya ↔ Leo converged on:**

- Treat paste confirm as a **placement mode**, not a modal — aligns with UX.md "confirm sparingly" while honoring the explicit confirm-to-place requirement.
- Selection and paste overlays render on the **canvas** (HTML Canvas 2D), never as DOM on pixels (DESIGN.md).
- **Release-to-select** mirrors `lineTool` pointer-up commit pattern.
- **Lucide `Copy` icon conflict** in `LeftToolRail` (frame duplicate) must be resolved before clipboard ships.
- **M** for Select tool shortcut; **Ctrl+C/V** work whenever a selection exists regardless of active tool.
- **Esc** cancels paste placement; **readOnly** cancels selection/paste and disables tool input during playback.
- Paste off-canvas: **clip** to grid bounds; transparent pixels (index 0) copy and paste faithfully.
- **Space+drag** temporary pan during paste placement — avoids forcing Hand tool switch mid-flow.

**Unresolved tension (product call):** Click-to-place vs Enter-only confirm — **recommend both**: click is primary for pointer users; Enter for keyboard-first Riley.

## Findings

### Critical (P0) — blocks task completion or trust

1. **Paste placement mode must be unmissable** — Without clear mode entry (ghost preview + status copy + cursor change), users will think Ctrl+V failed. Status left: *"Click to place · Enter to confirm · Esc to cancel."*
2. **Canvas-native selection overlay** — Marching ants + drag preview rect must render in canvas layer; DOM overlays violate DESIGN.md and break at zoom/pan.
3. **readOnly must hard-block select/copy/paste** — During animation playback (`readOnly: true`), disable Select tool input, cancel in-flight paste/selection, and mirror `useCanUndo` / `useCanRedo` guards. Entering playback mid-paste must not leave a ghost on screen.
4. **Icon semantics collision** — `LeftToolRail` uses Lucide `Copy` for frame duplicate; clipboard Copy will confuse Morgan and Casey. Change frame-duplicate icon before shipping Select/clipboard.
5. **Undo/redo contract** — Paste commit = single `Command` on undo stack (cap 500). Partial paste (clipped off-canvas) still one undo. Redo must restore clipped result identically.

### Warnings (P1) — meaningful friction or inconsistency

1. **Modifier discoverability** — Shift (square) and Shift+C (ellipse) are invisible without status hints. Show contextual hints in status bar only while Select is active and pointer is down: *"Shift: square · Shift+C: circle."*
2. **Empty selection feedback** — Copy with no selection or 0×0 release → status *"Nothing to copy."* (no modal). Optional one-shot toast only if status bar message is easy to miss during workshop projection.
3. **Clipboard vs tool coupling** — Ctrl+C/V should work when Paint (or any tool) is active if a selection exists; copying should not require Select to remain active after selection is made.
4. **Hand tool / viewport pan during paste** — Do not require switching to Hand (loses paste mode). Implement **Space+drag** temporary pan (grab cursor) during placement; release Space returns to placing.
5. **Frame switch during paste** — Switching frames cancels paste with brief status *"Paste cancelled."* — predictable, no silent cross-frame paste.
6. **Shortcuts overlay gap** — `ShortcutsOverlay` lists B/E/I/G/L only; must add M, Ctrl+C, Ctrl+V, Esc (cancel placement), and modifier notes for Select.
7. **Tool rail density** — Seventh tool approaches DESIGN.md "max 6–8 tools"; Select fits but frame-duplicate button should stay visually secondary (already `mt-1 text-secondary/80`).

### Suggestions (P2) — polish and delight

1. **Selection dimensions in status bar** — When selection active: *"12×8 selection"* (JetBrains Mono) — helps Alex verify export regions.
2. **Reduced motion** — Static dashed border instead of animated marching ants when `prefers-reduced-motion`.
3. **Paste origin snap** — Ghost top-left snaps to cell grid (integer cells); no sub-pixel paste offset.
4. **Optional "Place" ghost button** — Small primary pill centered below canvas during paste only; status bar remains source of truth for Morgan.
5. **Clear selection** — Click empty canvas with Select active clears selection (standard pattern); Esc clears selection when not in paste mode.
6. **Edit menu entries** — Add Copy / Paste / Clear selection under Edit menu for Casey (icons + labels).

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — Paste mode: click/Enter to place; status bar spells it out
- [x] State visible (loading/saved/error)? — Marching ants = selection; ghost = paste mode
- [x] Modals justified? — No modal for paste; placement mode instead
- [ ] Patterns consistent? — ⚠️ Resolve Copy icon conflict; align with line-tool release commit
- [x] Overwhelming on first visit? — Select is one more rail tool; ellipse is modifier-gated
- [x] Edge cases designed? — Empty copy, off-canvas clip, transparent, readOnly, frame switch
- [x] Hierarchy matches priority? — Canvas hero; chrome hints only during relevant modes
- [x] Beauty serves clarity? — Thin accent ants; 70% ghost opacity distinct from onion-skin

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ✅ | M → drag/release → Ctrl+C → Ctrl+V → place → undo |
| One decision per step | ✅ | Select region → choose position → confirm |
| Progressive disclosure | ✅ | Rect default; square/ellipse via modifiers |
| Immediate feedback | ✅ | Live drag rect; ghost follows pointer in paste mode |
| Forgiving (undo/autosave) | ✅ | Esc cancels paste; single undo for paste |
| Visual hierarchy | ✅ | Overlay on canvas only; status hints in secondary chrome |
| Flow tested end-to-end | ⚠️ | Needs matrix: readOnly, empty copy, partial off-canvas, frame switch |

## Agreed recommendations

### Key UX decisions (binding for implementation)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Select commit timing | **Pointer release** | Matches `lineTool` `onPointerUp`; avoids accidental select on click |
| Paste confirm mechanism | **Placement mode** (ghost + click/Enter), not dialog | User requirement + UX.md modal sparingly |
| Paste cancel | **Escape** | Consistent with overlay dismiss pattern; highest priority when paste active |
| Selection visual | **Dashed rect while dragging; marching ants on commit** | Industry standard; canvas-rendered |
| Resize handles | **None in v1** | Progressive disclosure; copy/paste is the job |
| Tool shortcut | **M** (Select) | Avoids S/Save confusion; H/L already taken |
| Copy/Paste shortcuts | **Ctrl+C / Ctrl+V** | Cross-tool when selection exists |
| Off-canvas paste | **Clip to bounds** | Partial paste better than reject |
| Transparent pixels | **Copy index 0; paste as clear** | Matches eraser semantics |
| readOnly | **Block all select/clipboard; cancel modes** | Parity with `fillTool` / playback tests |
| Pan during paste | **Space+drag** temporary pan | Hand tool switch breaks placement flow |
| Frame duplicate icon | **Replace Lucide `Copy`** | Prevent clipboard icon collision |

### Prioritized action items

1. **Define `pastePlacementMode` state** in editor store (origin cell, clipboard buffer, active flag) with enter/confirm/cancel actions — `eng` — **M**
2. **Canvas overlay renderer** for selection rect, marching ants, and paste ghost (70% opacity; clip to grid) — `eng` — **M**
3. **Status bar contextual hints** for Select drag modifiers and paste placement copy strings in `content/copy.ts` — `ux` — **S**
4. **Resolve frame-duplicate icon** (`Layers` or custom sprite-sheet mark) in `LeftToolRail` — `ui` — **S**
5. **Shortcut wiring**: M tool, Ctrl+C/V, Esc priority (paste > selection clear > shortcuts overlay) in `shortcuts.ts` — `eng` — **S**
6. **readOnly guards** on select tool, clipboard shortcuts, and playback entry (cancel ghost/selection) — `eng` — **S**
7. **Space+drag pan** during paste placement in `Canvas.tsx` — `eng` — **M**
8. **Shortcuts overlay + Edit menu** rows for copy/paste/select — `ux` — **S**
9. **Single `PasteCellsCommand`** (or equivalent) for undo/redo — `eng` — **M**
10. **Reduced-motion static ants** — `ui` — **S**

## Unresolved tension

- **Click vs Enter as primary paste confirm:** Recommend **click primary**, Enter secondary — Riley paints with mouse; Alex may prefer Enter. Both should work; no exclusive choice required.
- **Persist selection after paste:** Recommend **clear selection after successful paste** (reduces accidental re-paste); dissent: keep selection for repeated paste (Ctrl+V again). **Compromise:** keep selection, reset clipboard position on each Ctrl+V — product can A/B later.

## Files reviewed

- `UX.md` — personas, creative-freedom principles, confirm-sparingly rule
- `DESIGN.md` — canvas-as-hero, tool rail spec, tokens, no DOM on pixels
- `.cursor/skills/ux-seamless-flows/SKILL.md` — mistakes + practices checklist
- `apps/web/src/shell/LeftToolRail.tsx` — tool rail layout; Copy icon conflict
- `apps/web/src/shell/StatusBar.tsx` — status message + hover cell pattern
- `apps/web/src/state/editorStore.ts` — readOnly, undo stack, stroke preview hooks
- `apps/web/src/state/shortcuts.ts` — tool shortcuts B/E/I/G/L/H
- `apps/web/src/tools/lineTool.ts` — pointer-up commit pattern
- `apps/web/src/tools/strokePreview.ts` — preview overlay precedent
- `apps/web/src/tools/handTool.ts`, `apps/web/src/canvas/Canvas.tsx` — pan/readOnly behavior
- `apps/web/src/content/tools.ts`, `apps/web/src/components/onboarding/ShortcutsOverlay.tsx` — microcopy + shortcut surfacing

## References

- ux-seamless-flows skill (12 mistakes, 10 practices)
- UX.md § Riley jobs-to-be-done, creative-freedom principles, interaction patterns
- DESIGN.md § toolbar tools, canvas rendering, iconography, status bar tokens
