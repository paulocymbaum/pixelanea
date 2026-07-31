# Pixelanea Frontend Reference

Extended patterns for `pixelanea-frontend-standards`. Read when implementing new modules.

## Folder layout (`apps/web`)

```text
apps/web/src/
├── pages/
│   ├── EditorPage.tsx           # main editor — shell + canvas
│   ├── NewProjectPage.tsx       # two front doors (blank / image / animation)
│   └── ImportWizardPage.tsx     # optional: wizard as dedicated route
├── shell/
│   ├── AppHeader.tsx            # logo, menus, project name, theme
│   ├── EditorLayout.tsx         # region grid; min 60% canvas width
│   ├── LeftToolRail.tsx         # tool buttons slot
│   ├── RightPalettePanel.tsx    # collapsible palette slot
│   └── BottomFrameStrip.tsx     # frame strip + animation; hidden if frameCount ≤ 1
├── components/
│   ├── ui/                      # Button, Dialog, Tooltip, Slider (Radix + CVA)
│   ├── toolbar/                 # ToolButton, UndoRedo
│   ├── palette/                 # SwatchGrid, PaletteEditor, PaletteLock, presets
│   ├── frames/                  # FrameThumbnail, FrameStrip
│   ├── animation/               # AnimationPlayer, FpsSlider, LoopToggle
│   ├── project/                 # NewProjectDialog, OpenSave dialogs
│   ├── import/                  # PixelateWizard steps + live preview
│   └── onboarding/              # SkippableOverlay (3 steps)
├── canvas/
│   ├── coordinates.ts           # world ↔ screen, snap, zoom, pan
│   ├── renderer.ts              # checkerboard, grid, pixels, onion-skin
│   ├── inputRouter.ts           # pointer capture, keyboard → tool
│   └── Canvas.tsx               # mount + wire events
├── tools/
│   ├── paint.ts, eraser.ts, eyedropper.ts, frameDuplicate.ts, importPixelate.ts
│   └── registry.ts
├── state/
│   ├── editorStore.ts           # tool, color, frame, grid, undo/redo
│   ├── uiStore.ts               # panels, wizard step, technical info flag
│   ├── sessionStore.ts          # theme, collapse prefs (localStorage)
│   ├── shortcuts.ts             # single keyboard map
│   ├── commands/                # PaintCellCommand, ClearCellCommand, …
│   ├── persist.ts               # façade: schedule* / flush* / reset
│   └── sync/                    # SyncCoordinator, snapshots, types
├── content/
│   ├── copy.ts                  # success, empty states
│   ├── errors.ts                # user-facing error strings
│   └── tools.ts                 # tool labels ("Fix mistakes" for eraser)
├── api/
│   ├── generated/               # OpenAPI output — do not hand-edit
│   ├── projects.ts, frames.ts, palette.ts, import.ts
│   └── errors.ts                # map HTTP → content/errors
└── styles/
    ├── tokens.css               # CSS variables from DESIGN.md
    ├── theme.css                # light/dark + OS preference
    └── globals.css
```

Public assets: `apps/web/public/` — favicon, PWA icons, logo SVGs per DESIGN asset checklist.

## Chrome vs viewport boundary

| Concern | Chrome (`shell/`, `components/`, `styles/`) | Viewport (`canvas/`) |
|---------|---------------------------------------------|----------------------|
| Colors | `accent`, `bg-surface`, `text-primary` | `checker-a/b`, `grid-line`, user swatches |
| Typography | Outfit, JetBrains Mono in status | N/A — no text on canvas |
| Motion | 150ms panel toggle | 0ms tool switch |
| Brand greens | Toolbar, buttons, focus ring | **Never** tint pixels |
| DOM | React components | Single `<canvas>` — no per-pixel DOM |

Rule from DESIGN: **never overlay DOM elements on individual pixels.**

## Shell layout spec (from DESIGN.md)

```text
┌─────────────────────────────────────────────────────────────────┐
│  [logo]  File  Edit  View          [project name]    [theme] ⓘ │
├────────┬────────────────────────────────────────────┬───────────┤
│        │                                            │           │
│ Tools  │              CANVAS (hero, ≥60% width)     │  Palette  │
│ +      │                                            │  swatches │
│ labels │                                            │  + editor │
│        │                                            │           │
├────────┴────────────────────────────────────────────┴───────────┤
│  Frame strip  [1][2][3]...[8]     ▶  8 fps  loop              │
└─────────────────────────────────────────────────────────────────┘
```

`EditorLayout` enforces:

- Canvas column: `min-width: 60vw`, centered
- Left rail: fixed width; tools stacked with icon + label below
- Right panel: collapsible; width remembered in `sessionStore`
- Bottom strip: `display: none` when `frameCount <= 1`

Spacing: 4px base scale — 4, 8, 12, 16, 24, 32. Panel radius 6px; button 4px; swatch 2px.

## UI primitives (`components/ui/`)

Built with Radix primitives + `class-variance-authority` + Tailwind tokens.

| Component | Variants | DESIGN rule |
|-----------|----------|-------------|
| `Button` | primary, secondary, ghost, destructive | Destructive uses `ember` token only |
| `Dialog` | modal | Soft shadow only; flat elsewhere |
| `Tooltip` | — | For toolbar hints; not required on every control |
| `Slider` | — | FPS 1–24 in animation panel |

Do not import `editorStore` into `components/ui/`. Feature components compose primitives + wire store.

### Tool button active state

```tsx
// components/toolbar/ToolButton.tsx — illustrative
const toolButton = cva(
  'flex flex-col items-center justify-center min-h-10 min-w-10 gap-1',
  {
    variants: {
      active: {
        true: 'bg-accent-muted border-l-[3px] border-accent font-semibold',
        false: 'border-l-[3px] border-transparent',
      },
    },
  },
);
```

Active tool uses accent background + **3px left border** + semibold label — required for color-blind users (DESIGN + UX).

## Design tokens → implementation

### CSS variables (`styles/tokens.css`)

```css
:root {
  --bg-canvas: #E6E6E8;
  --bg-surface: #F4F4F6;
  --bg-elevated: #FFFFFF;
  --text-primary: #18181B;
  --accent: #3F6F5A;
  --accent-muted: #D8EBE2;
  --checker-a: #CCCCCC;
  --checker-b: #FFFFFF;
  --grid-line: rgba(0, 0, 0, 0.08);
  --onion-skin: rgba(130, 196, 166, 0.25);
  --focus-ring: #3F6F5A;
}
.dark { /* dark theme overrides per DESIGN.md */ }
```

### Canvas functional tokens (renderer only)

```typescript
// canvas/renderer.ts — read from CSS or shared constants
const CANVAS_TOKENS = {
  checkerA: 'var(--checker-a)',
  checkerB: 'var(--checker-b)',
  gridLine: 'var(--grid-line)',
  onionSkin: 'var(--onion-skin)',
} as const;
```

Zoom: 25%–3200% stepped; fit-to-view on open. Grid lines off at fit zoom; on at ≥8×.

## State architecture

### editorStore (Zustand)

```typescript
interface EditorState {
  projectId: string | null;
  activeToolId: string;
  activeColor: string;
  activeSlot: number;
  frameIndex: number;
  frameCount: number;
  paletteLocked: boolean;
  grids: Map<number, PixelGrid>;
  undoStack: Command[];
  redoStack: Command[];
  readOnly: boolean;

  dispatch: (cmd: Command | Command[]) => void;
  undo: () => void;
  redo: () => void;
  setActiveTool: (id: string) => void;
  setPaletteLocked: (locked: boolean) => void;
}
```

`readOnly` is set by `AnimationPlayer` on play; cleared on pause. Tools and canvas check `ToolContext.readOnly`.

### uiStore (session UI)

```typescript
interface UiState {
  palettePanelCollapsed: boolean;
  onboardingDismissed: boolean;
  showTechnicalInfo: boolean;   // Alex: hex + color index in status bar
  importWizardStep: number;
  setPaletteCollapsed: (v: boolean) => void;
}
```

### sessionStore (localStorage)

Persist: `theme` (light | dark | system), `palettePanelCollapsed`, `lastPreset`, `hasVisited` (skip new-project chooser after first visit per UX rule).

## Tool plugin interface

```typescript
interface Tool {
  id: string;
  name: string;
  cursor: string;

  onActivate(ctx: ToolContext): void;
  onDeactivate(ctx: ToolContext): void;

  onPointerDown(e: PointerEvent, cell: CellCoord): Command | Command[] | void;
  onPointerMove(e: PointerEvent, cell: CellCoord): Command | Command[] | void;
  onPointerUp(e: PointerEvent, cell: CellCoord): Command | Command[] | void;

  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void;
}
```

`ToolContext`: active color, frame index, `dispatch`, `readOnly`, `paletteLocked` (reject off-palette in paint tool).

### Built-in tools (v1)

| Tool | Module | Command / side effect | UX note |
|------|--------|----------------------|---------|
| Paint | `tools/paint.ts` | `PaintCellCommand` | Default active on editor open |
| Eraser | `tools/eraser.ts` | `ClearCellCommand` | Label "Fix mistakes" in onboarding |
| Eyedropper | `tools/eyedropper.ts` | updates `activeColor` | Works when palette locked |
| Frame duplicate | `tools/frameDuplicate.ts` | API + reload | Confirm dialog — one of three allowed confirms |
| Import pixelate | `tools/importPixelate.ts` | wizard → API | Casey front door |

## Command pattern

```typescript
interface Command {
  execute(state: EditorState): void;
  undo(state: EditorState): void;
}
```

Stack cap: 500. Save persists resulting grid, not history (via `SyncCoordinator`).

## Backend sync (`state/persist.ts` + `state/sync/`)

The sync layer (sometimes called the “throttle layer” in planning docs) is **not** a pointer-event throttle. It is a **serialized write coordinator**: debounce + per-key queue + latest-wins coalescing for `PUT /frames` and `PUT /palette`.

```text
editorStore mutation → scheduleFrameSync | schedulePaletteSync
                              ↓
                     SyncCoordinator (500ms debounce per lane)
                              ↓
                     api/frames | api/palette
```

### When to use

| API | Use when |
|-----|----------|
| `scheduleFrameSync()` | After `dispatch`, undo, redo — paint path; debounced |
| `schedulePaletteSync()` | After palette add/edit/remove/preset; debounced |
| `flushFrameSync()` | Before frame switch, export, playback; `await` when `isDirty` |
| `flushPaletteSync()` | Palette Save button; immediate persist |
| `flushAllSync()` | Before bundle save (`useProjectFileActions`) |
| `resetPersistState()` | On project load / open — cancel pending work |

### When **not** to use / anti-patterns

- **Do not** call `saveFrame` / `savePalette` from `components/`, `canvas/`, or `tools/`.
- **Do not** add component-level `setTimeout` debounce for autosave.
- **Do not** `await` on pointer-move paths — only `schedule*`.
- **Do not** partial frame PATCH — full `Uint8Array` per PUT only.

### Modules

| File | Role |
|------|------|
| `persist.ts` | Public API; wires store callbacks to coordinator |
| `sync/syncCoordinator.ts` | Serial queue, in-flight coalesce, epoch reset |
| `sync/snapshots.ts` | Clone pixels/colors from `editorStore` |
| `sync/types.ts` | `SyncKey`, `SYNC_DEBOUNCE_MS` |

See [ARCHITECTURE.md](../../../ARCHITECTURE.md#backend-sync-synccoordinator) for the full lane diagram.

## Keyboard map (`state/shortcuts.ts`)

Single registration point — mount once in `EditorPage`:

| Key | Action |
|-----|--------|
| `1`–`9` | Select palette slot |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `B` / `E` / `I` | Paint / Eraser / Eyedropper (example tool keys) |
| `?` | Shortcuts overlay |

Every paint action must be reachable by pointer and keyboard (UX creative-freedom principle).

## UX flows → module wiring

### Flow 1 — First pixel

```text
NewProjectPage (blank 32×32) → EditorPage → focus canvas → toolbar paint active
```

- `NewProjectPage`: three equal cards — blank, from image, animation toggle
- No account; optional skippable `onboarding/SkippableOverlay`
- After first visit: `sessionStore.hasVisited` → one-click to last preference

### Flow 2 — Photo to pixel

```text
NewProjectPage (from image) → import/PixelateWizard → EditorPage
```

Wizard steps in `components/import/`:

1. Drop / pick file
2. Resolution preset ("Icon 16×16", "Sprite 32×32")
3. Palette preset (Retro, Gameboy, Monochrome)
4. Live preview → Accept → `POST /import/pixelate`

Back button always available; land in edit mode without extra confirm.

### Flow 3 — Walk cycle

```text
EditorPage → draw frame 0 → frameDuplicate tool → BottomFrameStrip appears
          → edit frames → AnimationPlayer play → pause to tweak → Save
```

`BottomFrameStrip` mounts when `frameCount > 1` after duplicate API returns.

### Flow 4 — Classroom

- `project/OpenDialog` — plain errors from `content/errors`
- Toolbar: icon + label always
- Template opens with 8-color palette pre-filled

### Flow 5 — Constrained edit

- `palette/PaletteLock` toggle in panel header
- Paint tool checks `paletteLocked` before dispatch
- Export path warns if off-palette pixels (future `api/export` check)

## Confirmation policy (UX)

Interrupt **only** when necessary:

| Action | Confirm? |
|--------|----------|
| Paint, color change, frame switch | No |
| Tool switch | No |
| Duplicate to 8/16/32 frames | Yes — pick count |
| Save overwrite | Yes |
| Delete project | Yes |
| Remove palette color in use | Yes |
| Import wizard accept | No — preview is the decision |

Implement confirms in `components/project/` or shared `ui/ConfirmDialog` — not scattered `window.confirm`.

## Animation preview

- `AnimationPlayer` in `components/animation/`
- Play: `editorStore.readOnly = true`; advance `frameIndex` via `requestAnimationFrame`
- Pause: `readOnly = false`; stay on current frame
- Frame strip dims during play; current thumbnail highlighted
- FPS slider 1–24, default 8; loop on by default

## API layer

```typescript
// api/frames.ts
import { apiClient } from './generated';

export async function putFrame(projectId: string, index: number, body: FramePixels) {
  return apiClient.putFrame({ projectId, index, body });
}
```

Map errors:

```typescript
// api/errors.ts
import { errors } from '../content/errors';

export function toUserMessage(err: unknown): string {
  if (isNotFound(err)) return errors.openFailed;
  return errors.generic;
}
```

## Content / microcopy

| Situation | Key | Example |
|-----------|-----|---------|
| Save success | `copy.projectSaved` | "Project saved." |
| Open error | `errors.openFailed` | "Couldn't open this file. Is it a .pixelanea project?" |
| Empty canvas | `copy.emptyCanvas` | "Start drawing — pick a color on the left." |
| Delete project | `copy.deleteConfirm` | "Delete this project? This can't be undone." |

No emoji celebrations; no raw HTTP codes in UI.

## Progressive disclosure checklist

| UI element | Show when |
|------------|-----------|
| `BottomFrameStrip` | `frameCount > 1` |
| Animation FPS / loop | Same as frame strip |
| Color index overlay | `uiStore.showTechnicalInfo` |
| Onboarding overlay | `!uiStore.onboardingDismissed && !sessionStore.hasVisited` |
| Palette lock prominence | Always visible in palette header (Alex) |

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| `fetch` with hand-written types | Generated OpenAPI client |
| Business logic in `shell/AppHeader` | Move to `components/project/` or store |
| Grid mutation in `PalettePanel` | `dispatch(Command)` |
| Inline `"Project saved!"` with emoji | `content/copy.ts` |
| `window.confirm` in tools | Shared `ConfirmDialog` |
| `isPlaying` checks everywhere | `readOnly` on `ToolContext` |
| Brand `accent` on canvas pixels | Functional canvas tokens only |
| Pixel font in toolbar | Outfit per DESIGN |
| Frame strip always visible | Conditional on `frameCount` |
| 12 dockable panels | Max 6–8 tools; collapsible right panel |
| Modal on tool switch | 0ms switch; no dialog |
| Scattered `keydown` listeners | `state/shortcuts.ts` |
| Direct `saveFrame` / `savePalette` in components | `persist.schedule*` / `persist.flush*` |
| Per-component autosave `setTimeout` | `state/sync/SyncCoordinator` |
| DOM overlay on canvas cells | Canvas 2D only |
| Theme hard-coded in components | `styles/tokens.css` + `sessionStore.theme` |

## Extension points

| Future feature | Add without breaking layers |
|----------------|----------------------------|
| New tool | `tools/` + registry + `toolbar/ToolButton` |
| Layers | `editorStore` slice + `renderer` layer pass |
| PNG spritesheet export | `api/export` + `components/project/` |
| PNG sequence import | `components/import/` step (Jordan persona) |
| i18n | Replace `content/` with locale files; same keys |
| GIF export | Backend encoder; UI calls new endpoint |

## Build order (frontend steps)

1. `styles/tokens.css` + Tailwind extension
2. `components/ui/` primitives
3. `shell/EditorLayout` + regions
4. `canvas/` renderer + coordinates
5. `state/editorStore` + commands
6. `tools/` + `toolbar/`
7. `pages/EditorPage` wire-up
8. `api/` + `persist.ts` / `sync/SyncCoordinator`
9. `components/import/` wizard (Casey flow)
10. `components/animation/` + frame strip
11. `content/` pass for all strings
12. `onboarding/` + `sessionStore`

## Domain glossary

| Term | Definition |
|------|------------|
| **Pixel grid** | 2D palette indices or colors for one frame |
| **Frame** | One animation cel; 1, 8, 16, or 32 per project |
| **Palette** | Ordered colors; may be locked |
| **Bundle** | `.pixelanea` ZIP — backend only |
| **Command** | Reversible edit for undo/redo |
| **Sync lane** | Serialized PUT queue: `frame:{project}:{index}` or `palette:{project}` |
| **Tool** | Interaction mode (paint, eraser, …) |
| **Chrome** | App shell outside the canvas viewport |
| **Viewport** | Canvas area where pixel art is drawn |
