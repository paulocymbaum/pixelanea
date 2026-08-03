# Pixelanea Engineering Practices

SOLID, DRY, and Clean Code conventions for the monorepo. Derived from [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN.md](./DESIGN.md), and [UX.md](./UX.md).

| Area | Detailed guide |
|------|----------------|
| **Frontend** (`apps/web`) | This document § [Frontend](#frontend-appsweb) · Agent skill: `.cursor/skills/pixelanea-frontend-standards/` |
| **Backend** (`server/`) | Agent skill: `.cursor/skills/pixelanea-cpp-standards/` |

---

## Cross-cutting rules

1. **Contract-first API** — `contracts/openapi.yaml` is the single source of truth; regenerate the TypeScript client after changes.
2. **Dependency direction** — UI → API contracts → server → domain ← persistence. Never reverse.
3. **Portable projects** — `.pixelanea` bundle format and SQLite schema are owned by `server/`; the UI never encodes blobs or reads the DB.
4. **Client undo, server grids** — Undo/redo is frontend-only for speed; save/autosave persists the resulting pixel grid.
5. **Local-only** — Backend on `127.0.0.1`; no cloud calls from the editor.
6. **Desktop shell** — `apps/desktop/` may spawn `pixelanea-server` and host the WebView only; same API boundary as the browser; no direct DB or domain access from Rust.

---

## Frontend (`apps/web`)

### Chrome vs viewport

The editor splits **chrome** (modern React UI) from the **viewport** (HTML Canvas 2D). Brand colors and Outfit typography stay in chrome; the canvas uses functional tokens only (`checker-a`, `grid-line`, user swatches). Never overlay DOM on individual pixels.

### Layer diagram

```text
pages/        → routes; two front doors (blank / import wizard)
shell/        → AppHeader, EditorLayout, tool rail, palette slot, frame strip
components/   → toolbar, palette, frames, animation, project, import, onboarding
components/ui/→ Radix + CVA primitives (Button, Dialog, …)
canvas/       → coordinates, renderer, input router
tools/        → paint, eraser, eyedropper, frame tools
state/        → editorStore, uiStore, sessionStore, shortcuts
content/      → externalized microcopy (i18n-ready)
api/          → generated OpenAPI client wrappers
styles/       → tokens.css, theme.css, Tailwind extension
```

### Dependency rule

```text
pages → shell, components, canvas
shell + components → state selectors, content/
canvas + tools → state (commands), canvas/coordinates
state → api (generated client)
styles/ → CSS only (no React imports)
```

The frontend **must not** import SQLite, ZIP, stb, or server C++ modules. It **must not** hand-roll REST types that diverge from OpenAPI.

### Shell regions (DESIGN.md)

| Region | Module | UX rule |
|--------|--------|---------|
| Header | `shell/AppHeader` | Logo, menus, project name, theme toggle |
| Left rail | `shell/LeftToolRail` | Tools: icon + label; active = accent + 3px left border |
| Center | `canvas/` | Hero, ≥60% viewport width |
| Right panel | `shell/RightPalettePanel` | Collapsible palette; state in `sessionStore` |
| Bottom strip | `shell/BottomFrameStrip` | Hidden when `frameCount ≤ 1` |

### SOLID

#### Single Responsibility (SRP)

| Module | Owns | Does not own |
|--------|------|--------------|
| `shell/` | Layout regions, panel slots | Grid mutation, HTTP |
| `canvas/` | Coordinates, drawing, input routing | Undo stack, HTTP |
| `tools/` | Pointer/keyboard → `Command` | Rendering, JSX |
| `state/` | Editor/UI/session state, undo/redo | Canvas draw calls |
| `components/` | Feature UI, user intents | Grid mutation rules |
| `components/ui/` | Presentational primitives | Store, canvas |
| `content/` | User-facing strings | React |
| `api/` | Typed HTTP calls | Business logic |

#### Open/Closed (OCP)

- Extend editing via new `Tool` modules registered at startup—not `if (tool === 'paint')` chains.
- Extend undoable edits via new `Command` classes—not store special cases.
- New panels = new components + store selectors; avoid editing canvas core.

#### Liskov Substitution (LSP)

- All tools honor `ToolContext.readOnly` during animation preview.
- All commands implement reversible `execute` / `undo`.
- Eraser and paint share the same undo pipeline.

#### Interface Segregation (ISP)

- `ToolContext` is minimal: color, frame, `dispatch`, `readOnly`.
- Components use narrow Zustand selectors—not the entire store.
- `api/` split by aggregate (`projects`, `frames`, `palette`).

#### Dependency Inversion (DIP)

- UI depends on store hooks and `ToolContext` abstractions—not concrete tool classes.
- Persistence uses generated client types—never parallel hand-written DTOs.
- Tools call `dispatch(command)`—not `useEditorStore.setState` directly.

### DRY

| Concern | Single source |
|---------|---------------|
| API shapes | `contracts/openapi.yaml` → generated client |
| World ↔ screen math | `canvas/coordinates.ts` |
| Undoable edits | `Command` → store → one autosave path |
| Visual design | [DESIGN.md](./DESIGN.md) → `styles/tokens.css` |
| User copy | `content/` — [UX.md](./UX.md) microcopy guidelines |
| Keyboard shortcuts | `state/shortcuts.ts` — single map |
| Preview edit lock | `ToolContext.readOnly` set by `AnimationPlayer` |
| Confirm dialogs | Only: delete, overwrite, duplicate frames, remove in-use color |

### Clean Code

- **TypeScript strict**; generated types for all API payloads.
- **Domain vocabulary** in code and copy: pixel grid, frame, palette, bundle, command, tool.
- **Short functions**; extract when rendering + state + API mix in one place.
- **Early returns** for `readOnly`, loading, and missing project.
- **Comments explain why** (debounce ms, stack cap)—not what the code obviously does.
- **Keyboard-first** per [UX.md](./UX.md); shortcuts live in one map, not scattered literals.

### Performance

- Paint drag: update local grid immediately; redraw affected cells only.
- Frame switch: serve from local cache; prefetch neighbors when cheap.
- Animation: `requestAnimationFrame` + FPS clock; canvas read-only while playing.
- Autosave: debounced `PUT /frames/{index}`—never block pointer events on network.

### Data flow

```text
pointer → canvas (cell) → Tool → Command?
                              ↓
                    store.dispatch → grid + undo
                              ↓
                    canvas redraw (local)
                              ↓
                    debounced PUT /frames (persist)
```

### UX flows → modules

| Flow | Entry | Modules |
|------|-------|---------|
| First pixel | New project → blank | `pages/`, `canvas/`, `toolbar/` |
| Photo to pixel | New project → from image | `components/import/`, `api/import` |
| Walk cycle | Duplicate frames + play | `tools/frameDuplicate`, `animation/`, `frames/` |
| Classroom | Open template | `components/project/`, `content/` |
| Constrained edit | Palette lock | `components/palette/PaletteLock` |

### Review checklist (frontend)

- [ ] No persistence or bundle logic in React code
- [ ] API types from generated client only
- [ ] New behavior = Tool + Command (or api call + load), not inline mutation in components
- [ ] `readOnly` respected during preview
- [ ] Coordinate math only in `canvas/`
- [ ] Chrome uses design tokens; canvas uses functional tokens only
- [ ] Copy from `content/`, not inline strings
- [ ] Frame strip hidden when `frameCount ≤ 1`; confirms only where UX allows
- [ ] Toolbar: icon + label; active tool uses border + weight
- [ ] OpenAPI updated + client regenerated if API changed

---

## Backend (`server/`)

See `.cursor/skills/pixelanea-cpp-standards/SKILL.md` for full C++ SOLID/DRY/Clean Code rules.

Summary:

- `api/` → `domain/` ← `db/`, `export/`, `image/`
- Repositories own SQL; domain stays pure; pixel blob codec in one place.
- Handlers are thin; hot paths avoid redundant copies.

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design
- [DESIGN.md](./DESIGN.md) — visual system
- [UX.md](./UX.md) — flows and shortcuts
- [DEPENDENCIES.md](./DEPENDENCIES.md) — stack versions
