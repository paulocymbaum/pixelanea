# Pixelanea User Guide

**Make pixel art. Keep it local.**

Pixelanea is a free pixel art editor that runs entirely on your computer. Your projects stay in `.pixelanea` files — one portable bundle you can copy, email, or put on a USB drive.

## Getting started

When you open Pixelanea, you see two equal choices:

| Path | Best for |
|------|----------|
| **Start blank** | Drawing from scratch — sprites, icons, tile sketches |
| **From image** | Turning a photo or sketch into pixel art |

Both paths lead to the same editor. Pick whichever matches your project.

### Blank canvas

1. Click **Start blank**.
2. Choose a canvas size (16×16, 32×32, 64×64, or custom dimensions).
3. Optionally enable animation and pick 8, 16, or 32 starting frames.
4. Click **Create project**.

### Import from image

1. Click **From image**.
2. Drop or select a PNG, JPEG, or other supported image.
3. Pick output size and palette options.
4. Preview the pixelated result, then accept to open the editor.

> **Tip:** Background removal is on by default when saving pixelated output. Toggle it off in the import wizard if you need the original backdrop.

## Editor overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Header — File, project name, theme                         │
├────────┬──────────────────────────────────────┬─────────────┤
│ Tools  │           Canvas (main area)         │  Palette    │
│        │                                      │  panel      │
├────────┴──────────────────────────────────────┴─────────────┤
│  Frame strip + animation player (when frame count > 1)    │
└─────────────────────────────────────────────────────────────┘
```

- **Left rail** — drawing tools with icon and label
- **Center** — pixel canvas with zoom controls
- **Right panel** — color palette (collapsible)
- **Bottom strip** — frame thumbnails and playback controls (animated projects only)

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
- **Presets** — Retro, Gameboy, Monochrome.
- **Lock palette** — only palette colors can be painted (eyedropper still works).
- **Shading palettes** — pick a lighting style (cell-shading, lighting, dark) to generate shade ramps from the active color.

Save palette changes with **Save palette** to persist them in your project.

## Undo and redo

- `Ctrl+Z` — undo
- `Ctrl+Shift+Z` or `Ctrl+Y` — redo
- Toolbar buttons are also available

The undo stack keeps up to 500 steps per session.

## Animation

Projects with more than one frame show the bottom frame strip.

| Action | How |
|--------|-----|
| Switch frame | Click a thumbnail |
| Duplicate to 8/16/32 | Use the duplicate menu on the frame strip |
| Add blank frame | Duplicate blank option |
| Copy frame content | Copy frame to another index |
| Reorder frames | Drag and drop thumbnails |
| Onion skin | Toggle to see the previous frame at 30% opacity |
| Play / pause | Animation player controls |
| FPS | Slider from 1–24 (default 8) |
| Loop | Toggle loop on/off |

The canvas is read-only during playback so you can preview without accidental edits.

## Saving and opening

### Save

- **Save** — writes to the current `.pixelanea` file
- **Save As** — pick a new path and asset type (Character, Prop, Background, Animation)

A `.pixelanea` file is a ZIP bundle containing your SQLite project database and a manifest with checksums.

### Open

Use **File → Open** and select a `.pixelanea` file. If the file is corrupted or incompatible, Pixelanea shows a plain-language error.

## Export

From the File menu:

| Format | Contents |
|--------|----------|
| PNG | Current frame only |
| PNG spritesheet | All frames in one image |
| GIF | Animated export (server-rendered) |

If off-palette pixels exist and palette lock was used, you get a warning before export.

## Themes and accessibility

- Toggle light/dark theme in the header (follows OS preference by default).
- Press `?` to open the keyboard shortcuts overlay.
- Enable **Show technical info** in settings for cell coordinates, hex values, and palette index.
- All tools have visible labels and keyboard focus rings.

## Offline use

Pixelanea requires no internet after install. The API runs on `127.0.0.1` only — your data never leaves the device.

## Keyboard shortcuts

See [shortcuts.md](./shortcuts.md) for a printable reference card.

## Troubleshooting

| Problem | Try |
|---------|-----|
| "Cannot connect to server" | Run `./scripts/dev.sh` or restart the desktop app |
| Save fails | Check disk space and write permissions on the target folder |
| Import looks wrong | Try a smaller output size or different palette preset |
| Canvas won't edit | Stop animation playback first |

For developers and contributors, see [CONTRIBUTING.md](../CONTRIBUTING.md).
