# UX/UI Design Critique — Select Tool + Copy/Paste with Floating Paste Preview

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Target** | Select tool (rect/square/ellipse), clipboard copy/paste, confirm-to-place paste preview |
| **Persona** | Riley (primary), Casey, Morgan, Alex |
| **Scope** | Planned feature — informed by `LeftToolRail.tsx`, `StatusBar.tsx`, `lineTool.ts`, `types.ts`, `shortcuts.ts`, `copy.ts`, UX.md, DESIGN.md |

## Job statement

When I have drawn pixels I want to reuse or reposition, I want to select a region, copy it, and place it precisely on the canvas, so I can iterate on sprites and animation frames without redrawing.

## Golden path

1. Press **S** (or click **Select** in tool rail) → crosshair cursor on canvas  
2. Drag to define region → release → marching-ants border appears on selection  
3. **Ctrl+C** (or Edit → Copy) → selection stays active; status confirms copy  
4. **Ctrl+V** → paste preview follows pointer; dimmed “ghost” shows placement  
5. Move to target cell → **Enter** or **Place** → pixels commit as one undo step  
6. Auto-return to Select (or previous tool) → ready for next edit  

**Power path (Riley):** Select → Shift-drag (square) or Shift+C-drag (ellipse) → copy → switch frame → paste → place → undo if misaligned.

## Dialogue summary

**Maya:** Riley’s job is repositioning limbs across walk-cycle frames — select-on-release matches `lineTool` muscle memory. Casey needs the affordance visible without reading docs; Morgan needs labeled tools and a clear “Place” vs “Cancel.” Alex cares that pasted pixels preserve palette indices, not RGB approximations.

**Leo:** Six tools already fill the rail; Select is the seventh — within DESIGN’s 6–8 cap. The frame-duplicate button already uses Lucide `Copy` — Select must use `SquareDashed` or `BoxSelect`, never `Copy`. Selection chrome renders on the canvas layer (dashed rubber band while dragging; marching ants after release) — no DOM on pixels per DESIGN.md.

**Maya:** Paste must not be a modal — UX.md “confirm sparingly” allows commit-to-place because mis-paste is costly at pixel scale. Propose canvas-adjacent **placement bar** (between canvas and frame strip) with primary “Place” + ghost “Cancel,” plus status hints. Enter/Esc for keyboard parity.

**Leo:** Agree — status bar alone buries the primary action (mistake #1). Placement bar uses existing `Button` primary/ghost tokens; canvas stays hero. Paste preview at ~85% opacity via `previewCells`; committed canvas dimmed 40% outside preview bounds during place mode.

**Maya:** `readOnly` during playback is non-negotiable — same as paint/line. Paste-in-progress must cancel on Play, frame switch, or tool change with no silent commit. Shift+C is undiscoverable without status hints — show modifier text only while Select is active and pointer is down.

**Leo:** Marching ants respect `prefers-reduced-motion` — static dashed border instead of animation. Active Select tool: accent + 3px left border per `toolButtonVariants`. Unresolved: persist selection when switching to Eyedropper briefly, or clear? Recommend clear on tool switch (predictable); re-copy is cheap.

## Findings

### Critical (P0) — blocks task completion or trust

1. **Icon collision:** `LeftToolRail.tsx` uses Lucide `Copy` for frame duplicate. Select tool and Edit → Copy must not reuse that icon. Use `SquareDashed` (tool) vs `Copy` (frames) — distinct labels: “Select” vs “Duplicate frames.”
2. **Paste confirm pattern must be explicit before build:** Adopt **canvas-adjacent placement bar** (not modal, not status-bar-only). Primary “Place” + “Cancel”; Enter/Esc bindings. Without a visible primary action, Morgan’s students and Casey will click the canvas expecting commit (mistake #1, #12).
3. **readOnly / playback guard:** All select/copy/paste paths must honor `ctx.readOnly` (see `lineTool.ts`). Starting playback or switching frames during paste preview must **cancel** placement and restore canvas — never auto-commit.
4. **Single undo step for paste:** Entire placement = one `Command` on the undo stack. Partial paste or per-cell undo breaks “mistakes are cheap” (UX.md principle 2).
5. **Empty / invalid selection:** Copy with zero painted cells in region → inline status message, not toast-only. Paste with empty clipboard → no-op with hint.

### Warnings (P1) — meaningful friction or inconsistency

1. **Shift+C discoverability:** Ellipse constraint is power-user only; show `copy.statusSelectDragging` only during active drag with modifiers. Add to shortcuts overlay under Select tool.
2. **Status bar mode switching:** Today `StatusBar.tsx` shows project sync + hover cell. During select/paste modes, left span should show contextual hints (override idle “Ready”); right span keeps coords — Alex still gets cell position while placing.
3. **Tool rail order:** Insert Select after Line, before Hand (edit cluster: paint → erase → pick → fill → line → **select** → hand). Separates “modify pixels” from “navigate viewport.”
4. **Frame switch during paste:** If user clicks another frame thumbnail while paste preview is active, cancel preview (same as Play). Optional P2: “paste follows to new frame” is confusing for v1.
5. **Clipboard scope:** Session clipboard only (not OS clipboard) — status hint on first copy: “Copied selection” not “Copied” (avoids OS clipboard expectation on web/desktop hybrid).
6. **Cut (Ctrl+X):** Defer to v1.1 unless scoped now — half-implemented cut erodes trust.

### Suggestions (P2) — polish and delight

1. **Nudge selection** with arrow keys (1 cell) and Shift+arrow (8 cells) after selection, before copy.
2. **Duplicate in place** (Ctrl+D) as alias for copy+paste at same origin — Riley animation workflow.
3. **Selection bounds in technical info mode:** `12×8 at (4, 6)` in status right span when Alex enables View → Show technical info.
4. **Double-click Select tool** re-selects last region (session memory) — only if complexity budget allows.

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — **Placement bar “Place”** during paste; drag-release for select
- [x] State visible (loading/saved/error)? — Status hints per mode; “Copied” / “Move selection, then Place”
- [x] Modals justified? — **No modal** for paste; placement bar is the “confirm sparingly” exception
- [ ] Patterns consistent? — Align with `lineTool` drag-on-release; color filters “preview then apply”
- [x] Overwhelming on first visit? — One new tool; shortcuts in `?` overlay only
- [x] Edge cases designed? — Empty selection, readOnly, playback, cancel paths
- [x] Hierarchy matches priority? — Canvas hero; placement bar recedes until paste mode
- [x] Beauty serves clarity? — Canvas-rendered ants; no decorative chrome on grid

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ✅ | Select → copy → paste → place → undo |
| One decision per step | ✅ | Select region, then place position — never both at once |
| Progressive disclosure | ✅ | Shift / Shift+C hints only during drag |
| Immediate feedback | ✅ | Rubber band live; previewCells on paste move |
| Forgiving (undo/autosave) | ✅ | Esc cancels paste; one undo for place |
| Visual hierarchy | ✅ | Placement bar appears only in paste mode |
| Flow tested end-to-end | ⚠️ | Needs matrix cases for playback + frame switch cancel |

## Agreed recommendations

1. **Select tool in rail** — Label “Select”, icon `SquareDashed`, shortcut **S**, insert after Line. (`ui`, **S**)
2. **Canvas-rendered selection** — Drag: accent dashed rubber band (rect/square/ellipse). Release: 1px marching ants (static if `prefers-reduced-motion`). Optional 12% `accent-muted` fill inside selection. No resize handles in v1. (`eng` + `ui`, **M**)
3. **Paste placement bar** — Shown only in paste mode, centered below canvas viewport (above frame strip): primary **Place**, ghost **Cancel**. Enter / Esc keyboard parity. (`ui`, **S**)
4. **Paste preview rendering** — `previewCells` for floating pixels at 85% opacity; dim non-preview canvas to 60% via renderer overlay pass. Pointer move updates anchor cell (top-left of selection snapped to cell grid). (`eng`, **M**)
5. **readOnly behavior** — Select tool disabled (rail + shortcuts); copy/paste blocked; active paste preview cancelled when `readOnly` becomes true. Status: `copy.statusReadOnlyPlayback`. (`eng`, **S**)
6. **Status bar microcopy** — Mode-driven left message (see Microcopy section). (`ux`, **S**)
7. **Shortcuts** — See Shortcuts section; document in `ShortcutsOverlay.tsx`. (`eng`, **S**)
8. **Command model** — `CopyRegion` stores palette indices in session clipboard; `PasteCellsCommand` on place. (`eng`, **M**)

## Paste confirm UX pattern (decision)

| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| Modal dialog | ❌ | Breaks flow; violates “undo over confirm” except destructive ops |
| Status bar action only | ❌ | Primary action too easy to miss (mistake #1) |
| Floating chip on canvas | ⚠️ | Risks overlapping art; hard to hit at high zoom |
| **Canvas-adjacent placement bar** | ✅ | Visible primary CTA; no pixel DOM; matches “preview then commit” |
| Inline on canvas (click to place) | ⚠️ | No explicit cancel; mis-click commits |

**Chosen pattern:** Canvas-adjacent **placement bar** + status hints. Second click on canvas does **not** commit — only **Place** / Enter. Click-drag after paste starts moves origin (same as current preview position).

## Selection visual treatment (decision)

| Phase | Treatment |
|-------|-----------|
| Drag in progress | 1px dashed `accent` rectangle or ellipse; transparent fill |
| Shift held | Constrain to square (use max of width/height) |
| Shift+C held | Ellipse inscribed in drag bounds |
| After release | Marching ants (animated 1px checker dash) on border; subtle `accent-muted` fill at 10% opacity |
| After copy | Selection persists until click outside or tool change |
| Reduced motion | Static dashed border replaces animated ants |

Render via canvas overlay pass in `renderer.ts` — same layer as stroke preview, not React DOM.

## Shortcut recommendations

| Action | Shortcut | Notes |
|--------|----------|-------|
| Select tool | **S** | Mnemonic; not used in `shortcuts.ts` today |
| Square constraint | **Shift** + drag | Show in status while dragging |
| Ellipse constraint | **Shift+C** + drag | Hold both before/during drag |
| Copy | **Ctrl+C** / **Cmd+C** | Requires non-empty selection |
| Paste | **Ctrl+V** / **Cmd+V** | Enters paste mode if clipboard has content |
| Place | **Enter** | Only in paste mode |
| Cancel paste | **Esc** | Restores canvas; keeps clipboard |
| Deselect | **Esc** (when not in paste mode) | Clears selection |

Do **not** bind **C** alone — conflicts with “color” mental model and future features. Do **not** steal **V** from a future tool; paste standard is worth it.

## Microcopy suggestions (`copy.ts`)

```typescript
// Tool label (tools.ts)
select: "Select",

// Tool rail / menu
editMenuCopy: "Copy",
editMenuPaste: "Paste",

// Status bar — mode hints
statusSelectIdle: "Drag to select · Shift square · Shift+C circle",
statusSelectDragging: "Release to finish selection",
statusSelectDraggingSquare: "Square selection · release to finish",
statusSelectDraggingEllipse: "Circle selection · release to finish",
statusCopied: "Copied selection",
statusCopyEmpty: "Nothing to copy in that area",
statusPasteMove: "Move selection, then Place or press Enter",
statusPasteReadOnly: "Pause animation to paste",
statusReadOnlyPlayback: "Editing paused during playback",

// Placement bar
pastePlace: "Place",
pasteCancel: "Cancel",
pastePlaceHint: "Enter",

// Shortcuts overlay
shortcutSelect: "Select",
shortcutCopy: "Copy selection",
shortcutPaste: "Paste",
shortcutPastePlace: "Place paste",
shortcutPasteCancel: "Cancel paste",
shortcutSelectSquare: "Square selection (while dragging)",
shortcutSelectEllipse: "Circle selection (while dragging)",
```

Tone: plain, imperative, no jargon (“selection” not “marquee” or “mask”).

## Playback / readOnly behavior

| State | Select tool | Copy | Paste preview | Placement bar |
|-------|-------------|------|---------------|---------------|
| Editing | ✅ | ✅ | ✅ | ✅ when pasting |
| `readOnly` / playing | Disabled in rail | Blocked | Cancel + clear | Hidden |
| Paste mode → Play pressed | — | — | Cancel, no commit | Hidden |

Mirror `lineTool.ts`: early return when `ctx.readOnly`. `editorStorePlayback.ts` already sets `readOnly: isPlaying` and clears `placingLighting` — add `clearPastePreview()` alongside.

Tool switch while paste active: cancel preview. Tool switch while selection active: clear selection (predictable; document in status hint once).

## Risks and anti-patterns to avoid

| Risk | Anti-pattern | Mitigation |
|------|--------------|------------|
| Copy icon confusion | Reuse `Copy` for Select | `SquareDashed` + “Select” label |
| Silent paste on click | Photoshop-style second-click commit | Explicit Place / Enter only |
| Modal fatigue | “Paste here?” dialog | Placement bar |
| DOM per pixel | Handles/tooltips on grid | Canvas overlay only |
| OS clipboard mismatch | Promise cross-app paste | Session clipboard; plain copy in microcopy |
| Shift+C undiscoverable | Hidden in docs only | Contextual status + shortcuts overlay |
| Undo fragmentation | One command per cell | Single `PasteCellsCommand` |
| Tool rail clutter | 9+ tools | Cap at 8; defer Cut/magic wand |
| readOnly leak | Paste commits during play | Guard in tool + store + cancel on play |
| Ellipse off-grid | Smooth ellipse confuses pixel copy | Rasterize ellipse to cell mask on release |

## Unresolved tension

**Maya** wants selection to persist when briefly switching to Eyedropper (Riley samples color from selection edge). **Leo** wants clear on any tool switch to avoid orphaned overlays. **Product call:** v1 clears on tool switch; revisit “pin selection” if user testing shows friction.

## Files reviewed

- `apps/web/src/shell/LeftToolRail.tsx`
- `apps/web/src/shell/StatusBar.tsx`
- `apps/web/src/content/tools.ts`
- `apps/web/src/content/copy.ts`
- `apps/web/src/tools/types.ts`
- `apps/web/src/tools/lineTool.ts`
- `apps/web/src/tools/registry.ts`
- `apps/web/src/tools/strokePreview.ts`
- `apps/web/src/state/shortcuts.ts`
- `apps/web/src/state/editorStore.ts`
- `apps/web/src/state/editorStorePlayback.ts`
- `apps/web/src/canvas/useCanvasRenderState.ts`
- `UX.md` — personas, creative-freedom principles, interaction patterns
- `DESIGN.md` — tool rail, canvas rules, tokens, accessibility

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — 12 mistakes, top 10 practices
- `UX.md` — Riley/Casey/Morgan/Alex personas; confirm sparingly; keyboard parity
- `DESIGN.md` — canvas hero, tool button active state, no DOM on pixels, 6–8 tools
