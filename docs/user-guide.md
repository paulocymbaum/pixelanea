# Pixelanea User Guide

**Make pixel art. Keep it local.**

Pixelanea is a free pixel art editor that runs entirely on your computer. Your projects stay in `.pixelanea` files — one portable bundle you can copy, email, or put on a USB drive.

## Install (Linux)

### Debian / Ubuntu (.deb — recommended for workshops)

1. Download or copy `pixelanea_<version>_amd64.deb` to your computer.
2. Install from the folder containing the file:
   ```bash
   sudo apt install ./pixelanea_*.deb
   ```
   Or double-click the `.deb` file and follow the graphical installer.
   The installer pulls in **WebKitGTK** and **GTK 3** runtime libraries (`libwebkit2gtk-4.1-0`, `libgtk-3-0`) for the native app window.
3. Launch **Pixelanea** from your application menu, or run `pixelanea` in a terminal.
4. A **native Pixelanea window** opens (no browser tabs or address bar). Draw, save, and close the window when finished.

**Optional:** `sudo apt install zenity` enables native **File → Open** and **Save As** dialogs in the editor.

**Browser fallback:** If the native window does not start (missing WebKitGTK, headless session, etc.), run `pixelanea-browser` — it starts the local server and opens your default browser at http://127.0.0.1:8787.

### Portable archive (no root)

Extract the `.tar.gz` release, then run `./pixelanea` from the extracted folder — this launches the **native shell** (`pixelanea-shell`). For a user-level install: `./install.sh` (adds `~/.local/bin/pixelanea`). Use `./pixelanea-browser` inside the folder if the native window does not start. The `.deb` install path is preferred for workshops.

**Open a project from the file manager:** double-click a `.pixelanea` file (if your desktop registered the MIME type during install) or use **File → Open** inside the app.

## Getting started

When you open Pixelanea, you see two equal choices:

| Path | Best for |
|------|----------|
| **Start blank** | Drawing from scratch — sprites, icons, tile sketches |
| **From image** | Turning a photo or sketch into pixel art |

Both paths lead to the same editor. Pick whichever matches your project.

Returning users see a **quick-start** button that reuses your last canvas size (and optional 8-frame shortcut).

### Blank canvas

1. Click **Start blank**.
2. Choose a canvas size (16×16, 32×32, 64×64, 128×128, 256×256, or custom dimensions).
3. Click **Create project** for a single frame, or use the secondary **8 frames** shortcut to start animated.
4. Animation can also be added later from the frame strip (see [Animation](#animation)).

### Import from image

1. Click **From image**.
2. Drop or select a PNG, JPEG, or other supported image.
3. Pick output size and palette options.
4. Preview the pixelated result, then accept to open the editor.

> **Tip:** Background removal is on by default when saving pixelated output. Toggle it off in the import wizard if you need the original backdrop.

## Editor overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Connection banner (only when API unreachable) + Retry      │
├─────────────────────────────────────────────────────────────┤
│  Header — File, project name, save indicator, theme         │
├────────┬──────────────────────────────────────┬─────────────┤
│ Tools  │           Canvas (main area)         │  Palette    │
│        │                                      │  panel      │
├────────┴──────────────────────────────────────┴─────────────┤
│  Frame strip + animation player (when frame count > 1)    │
├─────────────────────────────────────────────────────────────┤
│  Status bar — save state · hovered cell                   │
└─────────────────────────────────────────────────────────────┘
```

- **Left rail** — drawing tools with icon and label
- **Center** — pixel canvas with zoom controls
- **Right panel** — color palette (collapsible)
- **Bottom strip** — frame thumbnails and playback controls (animated projects only)
- **Status bar** — answers “is my work saved?” (`All changes saved`, `Unsaved changes`, `Saving…`, or an error)

## Drawing tools

| Tool | Shortcut | What it does |
|------|----------|--------------|
| Paint | `B` | Place the active color on cells |
| Eraser | `E` | Clear cells (labeled "Fix mistakes") |
| Eyedropper | `I` | Pick a color from the canvas; switches to paint after picking |
| Fill | `G` | Flood-fill connected cells of the same color |
| Line | `L` | Draw a straight line between two points |

Click and drag on the canvas to paint or erase. Use the zoom controls (or fit-to-view) to work at comfortable magnification. Grid lines appear at 8× zoom and above.

## Palette

- Click a swatch to set the active color.
- Press `1`–`9` to select palette slots quickly.
- **Add / edit / remove** colors from the palette panel.
- **Presets** — Retro, Gameboy, Monochrome (grid of one-click swatches).
- **Lock palette** — only palette colors can be painted (eyedropper still works).
- **More tools** — expand the accordion for procedural shading ramps and color filters.

Palette changes save automatically with your project — there is no separate **Save palette** button.

## Undo and redo

- `Ctrl+Z` — undo
- `Ctrl+Shift+Z` or `Ctrl+Y` — redo
- Toolbar buttons are also available

The undo stack keeps up to 500 steps per session.

## Animation

Single-frame projects show an **Add frames for animation** call-to-action on the frame strip. Use **Duplicate frames** to expand to 8, 16, or 32 frames.

| Action | How |
|--------|-----|
| Start with 8 frames | Quick-start button on new-project screen, or duplicate from frame strip |
| Switch frame | Click a thumbnail |
| Duplicate to 8/16/32 | **Duplicate frames** on the frame strip |
| Add blank frame | Duplicate blank option |
| Copy frame content | Copy frame to another index |
| Reorder frames | Drag and drop thumbnails |
| Play / pause | Animation player controls |
| FPS | Slider from 1–24 (default 8) |
| Loop | Toggle loop on/off |

The canvas is read-only during playback so you can preview without accidental edits.

> **Note:** Onion skin is implemented but hidden by default in the current release. Enable it in `content/features.ts` for local builds.

## Saving and opening

### Desktop file picker (Linux)

On desktop builds, **File → Open** and **File → Save As** use the system file dialog (via `zenity`). If a manual path field appears instead, install zenity and restart:

```bash
sudo apt install zenity
```

The native app window shows a notice on first launch when `zenity` is missing. The `pixelanea-browser` fallback prints the same hint to the terminal.

### Save

- **Save** — writes to the current `.pixelanea` file via a native file picker (desktop) or path dialog (fallback)
- **Save As** — pick a new path; asset type defaults to Character (expand **Change asset type** for Prop, Background, or Animation)

A confirmation appears before overwriting an existing file. On success you see **Project saved.** in a toast and **All changes saved** in the status bar.

### Open

Use **File → Open** and select a `.pixelanea` file. If the file is corrupted or incompatible, Pixelanea shows a plain-language error.

### Unsaved changes

If you have unsaved work and choose **New**, **Open**, or **Import image**, Pixelanea asks whether to save, discard, or cancel.

A `.pixelanea` file is a ZIP bundle containing your SQLite project database and a manifest with checksums.

## Export

From the File menu:

| Format | Contents | Availability |
|--------|----------|--------------|
| PNG | Current frame only | Default |
| PNG spritesheet | All frames in one image | Feature flag (off by default) |
| GIF | Animated export (server-rendered) | Feature flag (off by default) |

If off-palette pixels exist and palette lock was used, you get a warning before export. Successful exports show a toast with the filename (e.g. **Exported my-art.png.**).

## Themes and accessibility

- Toggle light/dark theme in the header (follows OS preference by default).
- Press `?` to open the keyboard shortcuts overlay.
- Enable **Show technical info** in the View menu for cell coordinates, hex values, palette index, and server version in the status bar.
- All tools have visible labels and keyboard focus rings.

## Offline use

Pixelanea requires no internet after install. The API runs on `127.0.0.1` only — your data never leaves the device.

If the local API stops responding, a red **connection banner** appears at the top with a **Retry** button. The status bar also reflects the disconnected state.

## Keyboard shortcuts

See [shortcuts.md](./shortcuts.md) for a printable reference card.

## Troubleshooting

| Problem | Try |
|---------|-----|
| Connection banner / can't reach server | Click **Retry**; restart Pixelanea from the app menu or run `pixelanea` again |
| Native window won't open | Install WebKitGTK (`libwebkit2gtk-4.1-0`) or use `pixelanea-browser` |
| Port 8787 already in use | Choose **Open** to use the running instance, or **Cancel** and close the other copy first |
| Save fails | Check disk space and write permissions on the target folder |
| Import looks wrong | Try a smaller output size or different palette preset |
| Canvas won't edit | Stop animation playback first |
| Unsaved indicator won't clear | Wait for **Saving…** to finish; check connection banner |

For developers and contributors, see [CONTRIBUTING.md](../CONTRIBUTING.md).
