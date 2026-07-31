# Pixelanea Workshop Teacher Guide

A 45–60 minute introduction to pixel art for classrooms, coding clubs, and jam events. No accounts, Wi-Fi, or cloud storage required after install.

## Before the session

### Install Pixelanea

1. Follow [DEPENDENCIES.md](../../DEPENDENCIES.md) on each machine (or prepare a USB with a pre-built release when available).
2. Verify the app starts: `./scripts/dev.sh` → open http://localhost:5173.
3. Confirm `/api/health` returns OK.

### Room setup

- Projector: use **light theme** for better contrast on bright rooms (toggle in header).
- Seat students so the canvas area is visible on the shared screen.
- Print [shortcuts.md](../shortcuts.md) handouts (one per pair).

### Starter project (optional)

Create a blank **32×32** project before class:

1. **Start blank** → 32×32 → single frame → **Create project**.
2. **File → Save As** → `workshop-starter.pixelanea`.
3. Copy the file to student machines or a shared folder.

Students can open this file instead of creating from scratch to save time.

## Session outline

| Time | Activity |
|------|----------|
| 5 min | What is pixel art? Show a sprite and a `.pixelanea` file on a USB |
| 5 min | Two front doors demo — blank vs import |
| 15 min | Guided draw: face or fruit on 16×16 or 32×32 |
| 10 min | Palette: pick colors, try a preset, lock palette |
| 10 min | Eraser + undo practice ("Fix mistakes") |
| 10 min | Optional: duplicate to 8 frames, draw a blink or bounce, press Play |
| 5 min | Save As, copy file to USB / email |

## Teaching tips

### Persona cues (from [UX.md](../../UX.md))

- **Morgan (teacher):** emphasize local-only — no student accounts, no data upload.
- **Riley (game dev):** mention Godot/Unity sprite sizes (16×16, 32×32).
- **Casey (designer):** demo import-from-photo for quick results.

### Key phrases to use

| UI label | Say this |
|----------|----------|
| Eraser | "Fix mistakes" |
| Eyedropper | "Pick a color from your art" |
| Lock palette | "Stay inside your color set" |
| Save As | "Name your file so you can find it" |

### Common student questions

| Question | Answer |
|----------|--------|
| How do I fix a mistake? | Eraser tool or `Ctrl+Z` |
| How do I get my color back? | Eyedropper (`I`), then paint |
| Why can't I paint this color? | Palette is locked — unlock or pick from swatches |
| Where is my file? | Show the Save As path; remind them to copy the `.pixelanea` file |

## Mini challenges

Pick one based on time and age:

1. **Icon** — 16×16 heart, star, or sword using max 4 colors.
2. **Character** — 32×32 simple face with 3-shade palette (use shading palettes).
3. **Animation** — 8-frame blinking eye or waving hand.

## Assessment rubric (optional)

| Criteria | Meets | Exceeds |
|----------|-------|---------|
| File saved as `.pixelanea` | Yes | Named clearly + copied off machine |
| Uses ≤ palette limit | Stays in palette when locked | Chooses cohesive preset |
| Uses undo/eraser | Tries once | Uses without prompting |
| Animation (if taught) | Plays loop | 8 frames with visible motion |

## After the session

- Collect feedback: time to first pixel, save success rate (target >80%).
- Report blockers in GitHub Issues (install, projector contrast, save paths).

## Resources

- [User guide](../user-guide.md)
- [Shortcuts reference](../shortcuts.md)
- [BACKLOG.md](../../BACKLOG.md) — V1-304 PDF template deliverable tracked there
