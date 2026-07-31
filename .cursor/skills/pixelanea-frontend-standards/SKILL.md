---
name: pixelanea-frontend-standards
description: Enforces Pixelanea React frontend architecture, editor shell layout, canvas/tool patterns, design tokens, UX flows, and SOLID/DRY/Clean Code practices from ARCHITECTURE.md, DESIGN.md, and UX.md. Use when writing or reviewing apps/web code, shell layout, components, canvas, tools, editor store, wizards, animation player, accessibility, or frontend standards for this project.
---

# Pixelanea Frontend Standards

Standards for `apps/web` derived from [ARCHITECTURE.md](../../../ARCHITECTURE.md), [DESIGN.md](../../../DESIGN.md), and [UX.md](../../../UX.md). Apply on every frontend change.

## Dependency rule (non-negotiable)

```text
pages/  →  shell/, components/, canvas/
                ↓
shell/ + components/  →  state/ (selectors) + content/ (copy)
canvas/ + tools/      →  state/ (commands) + canvas/coordinates
state/                →  api/ (generated OpenAPI client)
styles/               →  (tokens only — no React imports)
```

| Layer | May depend on | Must NOT depend on |
|-------|---------------|-------------------|
| `pages/` | shell, components, canvas, state hooks | SQLite, raw `fetch`, tool internals |
| `shell/` | components, state (UI slice), content | canvas coordinate math, commands |
| `components/` | `components/ui/`, state selectors, content | grid mutation, HTTP |
| `components/ui/` | styles tokens, Radix primitives | editor store, canvas |
| `canvas/` | state (read), tools (dispatch) | HTTP, JSX chrome |
| `tools/` | `ToolContext`, `Command` types | React components, direct API calls |
| `state/` | `api/`, command types | DOM, Canvas 2D, JSX |
| `content/` | nothing in `apps/web` | React (plain string maps) |
| `api/` | generated client only | hand-rolled JSON field names |
| `styles/` | CSS variables only | React, Zustand |

**UI depends on API contracts; the server never depends on React.** Brand colors and Outfit typography stay in **chrome**; the canvas viewport uses functional tokens only (`checker-a`, `grid-line`, user palette swatches).

## Architecture layers (detailed)

Pixelanea frontend is split into **chrome** (modern app UI) and **viewport** (pixel grid). They never share rendering concerns.

```text
┌─────────────────────────────────────────────────────────────────┐
│  shell/AppHeader          pages route here                      │
├────────┬────────────────────────────────────────────┬───────────┤
│ shell/ │                                            │ components│
│ Left   │         canvas/ (hero, ≥60% width)         │ /palette  │
│ Tool   │         HTML Canvas 2D — no DOM on pixels  │           │
│ Rail   │                                            │ collapsible│
├────────┴────────────────────────────────────────────┴───────────┤
│  shell/BottomFrameStrip — visible when frameCount > 1           │
└─────────────────────────────────────────────────────────────────┘
```

### Layer reference

| Layer | Path | Responsibility | UX / design anchor |
|-------|------|----------------|-------------------|
| **Pages** | `pages/` | Route composition; mount shell + canvas; no business rules | Two front doors: blank vs import wizard ([UX § flows](UX.md)) |
| **Shell** | `shell/` | Editor regions: header, left rail, right panel slot, bottom strip | [DESIGN § Editor shell](DESIGN.md) — canvas ≥60% width, centered hero |
| **Feature components** | `components/{toolbar,palette,frames,animation,project,onboarding}/` | Persona-facing panels; emit intents only | Progressive disclosure; icon+label toolbar ([UX § matrix](UX.md)) |
| **UI primitives** | `components/ui/` | Button, Dialog, Tooltip, Slider — Radix + CVA + tokens | [DESIGN § Components](DESIGN.md) — 40×40 touch targets, focus rings |
| **Canvas** | `canvas/` | Coordinates, renderer, input router; functional canvas tokens | [DESIGN § Canvas rendering](DESIGN.md) — HiDPI, no brand in viewport |
| **Tools** | `tools/` | Pointer/keyboard → `Command`; respect `readOnly` | Built-in tools table in ARCHITECTURE.md |
| **State** | `state/` | Editor store, UI store, session persistence, sync coordinator, shortcuts | Undo cap 500; debounced autosave via `SyncCoordinator`; panel collapse memory |
| **Content** | `content/` | Externalized microcopy (i18n-ready) | [UX § microcopy](UX.md) — plain language, no error codes |
| **API** | `api/` | Thin wrappers over generated OpenAPI client | Contract-first; Vite proxy `/api` → `127.0.0.1:8787` |
| **Styles** | `styles/` | CSS variables, Tailwind extension, theme | [DESIGN § tokens](DESIGN.md) — light/dark, `prefers-reduced-motion` |

### Shell regions (`shell/`)

| Module | Region | Behavior |
|--------|--------|----------|
| `AppHeader` | Top bar | Logo lockup, File/Edit/View menus, project name, theme toggle |
| `EditorLayout` | Grid wrapper | Enforces min 60% canvas width; panel collapse slots |
| `LeftToolRail` | Left panel | Tool buttons — icon + label; active: accent bg + 3px left border |
| `RightPalettePanel` | Right panel | Palette swatches + editor; collapsible; state in `uiStore` |
| `BottomFrameStrip` | Bottom strip | Frame thumbnails + `AnimationPlayer`; **hidden when `frameCount ≤ 1`** |

Shell modules layout chrome only. They subscribe to `state/uiStore` and `state/editorStore` selectors — they never call `PUT /frames` or mutate the grid.

### Feature components (`components/`)

Organize by UX domain, not by atomic design level:

| Folder | Owns | Key UX rules |
|--------|------|--------------|
| `toolbar/` | Tool selection, undo/redo buttons | Always icon + label; eraser copy "Fix mistakes" in onboarding |
| `palette/` | Swatches, add/remove, presets, **palette lock** toggle | Lock rejects off-palette paints; confirm only if color in use on canvas |
| `frames/` | Thumbnail strip, frame switch | Instant switch from local cache; active frame accent border |
| `animation/` | Play/pause, FPS slider (1–24), loop toggle | Play → `readOnly`; pause → edit current frame |
| `project/` | New / Open / Save / Save As dialogs | Confirm only: overwrite, delete project |
| `onboarding/` | Skippable 3-step overlay (Morgan/Riley) | Never blocks paint; Casey uses import wizard instead |
| `import/` | Pixelate wizard (Casey front door) | Step indicator, back button, live preview before commit |

### State slices (`state/`)

| Store | Persists | Owns |
|-------|----------|------|
| `editorStore` | Session (in memory) | Active tool, color, frame, grid cache, undo/redo stacks |
| `uiStore` | Session | Panel open/collapse, onboarding dismissed, wizard step |
| `sessionStore` | `localStorage` | Theme, last palette preset, panel collapse, first-visit preference |
| `shortcuts.ts` | — | Single keyboard map (colors 1–9, tools, undo, zoom) |
| `persist.ts` | — | Façade over `sync/SyncCoordinator` — **only** autosave entry point |
| `sync/` | — | Serialized frame/palette PUT queue, snapshot cloning, coalescing |

Backend sync lives in **`state/persist.ts` + `state/sync/`** — not in components, tools, or `api/` callers. See [When to use the sync layer](#when-to-use-the-sync-layer) below.

### Content layer (`content/`)

All user-visible strings go through `content/` — never hard-code copy in components.

```typescript
// content/errors.ts
export const errors = {
  openFailed: "Couldn't open this file. Is it a .pixelanea project?",
} as const;
```

Map API failures to these strings in `api/errors.ts`. Success toasts use factual copy: `"Project saved."` — no emoji, no hype ([DESIGN § voice](DESIGN.md)).

### Styles layer (`styles/`)

| File | Role |
|------|------|
| `tokens.css` | CSS variables: `bg-surface`, `accent`, `checker-a`, etc. |
| `theme.css` | Light/dark class toggles; OS preference on first launch |
| `tailwind.config` extension | Mirrors tokens for utility classes ([DESIGN § Tailwind](DESIGN.md)) |

Canvas renderer reads functional tokens (`checker-a`, `grid-line`, `onion-skin`) — never `accent` or brand greens for pixel data.

## UX flows → code mapping

| Flow | Entry | Primary modules |
|------|-------|-----------------|
| First pixel (&lt;60s) | `pages/NewProjectPage` → blank 32×32 | `pages/EditorPage`, `canvas/`, `toolbar/` |
| Photo to pixel (&lt;5m) | `pages/NewProjectPage` → From image | `components/import/`, `api/import` |
| Walk cycle | Editor → duplicate frames | `tools/frameDuplicate`, `components/frames/`, `animation/` |
| Classroom | Open template `.pixelanea` | `components/project/`, `content/` |
| Constrained edit | Palette lock + 16×16 | `components/palette/PaletteLock`, `state/editorStore` |

**Progressive disclosure rules (enforce in components, not ad hoc):**

- Bottom frame strip: render only when `frameCount > 1`
- Technical info (hex, color index): opt-in via View menu → `uiStore.showTechnicalInfo`
- Onboarding overlay: skippable; never modal on tool switch
- Confirm dialogs: **only** delete project, overwrite file, duplicate frames, remove in-use color

## SOLID (project-specific)

### Single Responsibility

- **Shell** positions regions; does not paint pixels or own undo.
- **Canvas** maps coordinates and draws; does not own undo history or call `PUT /frames`.
- **Tools** translate events into `Command` objects; they do not render.
- **Feature components** present UI and dispatch intents; they do not implement grid mutation.
- **UI primitives** are presentational; no store imports.
- Split files when a module mixes layout, persistence, and command construction.

### Open/Closed

- New tool → `tools/` + register; new panel → `components/{domain}/` + shell slot.
- New undoable edit → `Command` class; new wizard step → `components/import/` step module.
- Theme/persona differences via `sessionStore` + collapsible panels — not separate apps or skins.

### Liskov Substitution

- Every `Tool` honors `ToolContext.readOnly` during animation preview.
- Every `Command` is reversible; eraser uses `ClearCellCommand` on the same undo path.
- UI primitives honor variant API (primary / secondary / ghost / destructive) consistently.

### Interface Segregation

- `ToolContext`: color, frame, `dispatch`, `readOnly` — nothing else.
- Components use narrow selectors (`useActiveColor`, `usePaletteCollapsed`).
- `api/` split per aggregate (`projects`, `frames`, `palette`, `import`).

### Dependency Inversion

- Shell and components depend on store hooks and `content/` — not concrete tool classes.
- Persistence via generated client only.
- Tools call `dispatch(command)` — not Zustand `setState` directly.

## DRY

- **One API contract:** `contracts/openapi.yaml` → generated TS client.
- **One coordinate system:** `canvas/coordinates.ts` only.
- **One undo path:** `Command` → store → local grid update.
- **One autosave policy:** `scheduleFrameSync` / `schedulePaletteSync` via `state/persist.ts` → `SyncCoordinator` — never per-component timers or direct `saveFrame`/`savePalette` from UI.
- **One design source:** [DESIGN.md](../../../DESIGN.md) tokens — no hard-coded hex in components.
- **One keyboard map:** `state/shortcuts.ts` — no scattered `useEffect` key listeners.
- **One copy source:** `content/` — no duplicate error strings.
- **One read-only gate:** `ToolContext.readOnly` from `AnimationPlayer` — not scattered `isPlaying`.

## Clean Code

- TypeScript strict; generated types for all API payloads.
- Domain glossary: pixel grid, frame, palette, bundle, command, tool.
- `PascalCase` components/types; `camelCase` functions; `kebab-case` files.
- Short functions; early returns for `readOnly`, loading, missing project.
- Errors and empty states use `content/` strings per [UX.md](../../../UX.md).
- Comment **why** (debounce ms, stack cap, progressive disclosure rules), not what.

## Accessibility (from DESIGN + UX)

- Body text ≥14px (`text-base`); toolbar labels always visible (Morgan).
- Active tool: accent + **3px left border + bold label** — not color alone.
- Focus: 2px `focus-ring` token; never removed without replacement.
- Touch targets ≥40×40 on toolbar and frame strip.
- `prefers-reduced-motion`: disable 150ms panel animation; tool switch stays 0ms.
- All shortcuts documented in `?` overlay; keyboard parity with pointer actions.

## Performance

| Path | Target | Techniques |
|------|--------|------------|
| Paint drag | 60fps feel | Local grid mutation; redraw affected cells only |
| Frame switch | Instant | Local frame cache; prefetch adjacent frames |
| Animation playback | Steady FPS | `requestAnimationFrame` + FPS timing; `readOnly` canvas |
| Autosave | Non-blocking | `scheduleFrameSync` / `schedulePaletteSync`; `flush*` before switch/save/export |
| Panel toggle | 150ms | CSS transition; respect `prefers-reduced-motion` |

Canvas: subscribe to grid/frame slices only; cache checkerboard off hot path; grid lines at ≥8× zoom only.

## Data flow (mandatory)

```text
pointer event → canvas (cell coord) → active Tool → Command | void
                                                      ↓
                                            store.dispatch(command)
                                                      ↓
                              local grid update + undo push + canvas redraw
                                                      ↓
                              scheduleFrameSync / schedulePaletteSync (debounced)
                                                      ↓
                              SyncCoordinator → PUT /frames | PUT /palette
                                                      ↓
                              flush* before frame switch, save bundle, export, play
```

## When to use the sync layer

All backend persistence for the active frame and palette goes through **`state/persist.ts`**. The coordinator (`state/sync/SyncCoordinator`) handles debounce, serialization, and race prevention.

| You need to… | Call | Do **not** |
|--------------|------|------------|
| Persist after paint / undo / palette edit | `scheduleFrameSync()` / `schedulePaletteSync()` from `editorStore` | `saveFrame` / `savePalette` in components |
| Guarantee data is on server before next step | `flushFrameSync()`, `flushPaletteSync()`, or `flushAllSync()` | `await schedule*` (schedule is fire-and-forget) |
| Switch frame or reload frame list | `await flushFrameSync()` when `isDirty` | Skip flush and load next frame |
| Save `.pixelanea` bundle | `await flushAllSync()` | Save while debounce timer pending without flush |
| Export spritesheet/GIF or start playback | `await flushFrameSync()` when dirty | Export from stale local-only grid |
| Open / load new project | `resetPersistState()` | Leave in-flight PUT callbacks updating old project |
| User clicks palette Save | `flushPaletteSync()` (via `editorStore.savePalette`) | Second debounce path in the panel |

**Add new sync behavior** by extending `SyncCoordinator` or `persist.ts` — not by adding `setTimeout` in a component. **Never** split frame blobs into partial updates; always send the full `Uint8Array` per frame.

Import pixelate: `components/import/` → `POST /import/pixelate` → frame load → render. No client-side quantization.

## Review checklist

Before merging `apps/web` changes:

- [ ] No SQL, filesystem, or bundle logic in the frontend
- [ ] No hand-rolled fetch types diverging from OpenAPI
- [ ] New edit behavior = `Tool` + `Command`, not inline store mutation in a component
- [ ] `readOnly` honored during animation preview
- [ ] Coordinate math only in `canvas/`
- [ ] Chrome uses design tokens; canvas uses functional tokens only
- [ ] User copy from `content/`, not inline strings (except dev-only)
- [ ] Progressive disclosure rules respected (frame strip, technical info, confirms)
- [ ] Toolbar tools have icon + label; active state uses border + weight
- [ ] Autosave through `persist.ts` / `SyncCoordinator` (no direct `saveFrame`/`savePalette` in UI)
- [ ] OpenAPI updated + client regenerated if API changed

## Additional resources

- Architecture: [ARCHITECTURE.md](../../../ARCHITECTURE.md)
- Shell layout, tokens, components: [DESIGN.md](../../../DESIGN.md)
- Flows, personas, microcopy: [UX.md](../../../UX.md)
- Folder layout, templates, anti-patterns: [reference.md](reference.md)
