# Pixelanea Workshop Teacher Guide

A 45–60 minute introduction to pixel art for classrooms, coding clubs, and jam events. No accounts, Wi-Fi, or cloud storage required after install.

## Before the session

### Install Pixelanea (lab prep — ≤5 steps)

1. Copy `pixelanea_<version>_amd64.deb` to each machine (USB, shared drive, or lab image).
2. Install: `sudo apt install ./pixelanea_*.deb` (or double-click the `.deb` in the file manager). WebKitGTK and GTK 3 are installed automatically as dependencies.
3. Optional but recommended: `sudo apt install zenity` for native File Open/Save dialogs.
4. Launch **Pixelanea** from the application menu, or run `pixelanea` in a terminal.
5. Confirm a **native Pixelanea window** opens (not a browser tab). Quick check: `curl -sf http://127.0.0.1:8787/api/health` returns OK.

If the native window fails on a machine, use `pixelanea-browser` as a fallback (opens the default browser to the same local URL).

> **Developers only:** from a git checkout use `pnpm package:deb` to build the `.deb` (requires Rust stable + WebKitGTK dev packages — see [DEPENDENCIES.md](../../DEPENDENCIES.md)), or `./scripts/install-desktop-linux.sh` for a user-level browser launcher without root.

### Room setup

- Projector: use **light theme** for better contrast on bright rooms (toggle in header).
- Seat students so the canvas area is visible on the shared screen.
- Print [shortcuts.md](../shortcuts.md) handouts (one per pair).
- Print the [student handout](./student-handout.md) ([PDF](./pdf/student-handout.pdf)) and [facilitator one-pager](./facilitator-one-pager.md) ([PDF](./pdf/facilitator-one-pager.pdf)).

### Workshop kit (E2-014)

| Asset | Path |
|-------|------|
| Facilitator one-pager | [facilitator-one-pager.md](./facilitator-one-pager.md) · [PDF](./pdf/facilitator-one-pager.pdf) |
| Student handout | [student-handout.md](./student-handout.md) · [PDF](./pdf/student-handout.pdf) |
| Template projects | [templates/README.md](./templates/README.md) |

### Starter project (optional)

Create a blank **32×32** project before class:

1. **Start blank** → 32×32 → **Create project** (or use the **8 frames** shortcut for animation).
2. **File → Save As** — the native file picker opens; choose `workshop-starter.pixelanea`.
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
| 10 min | Optional: **Duplicate frames** to 8, draw a blink or bounce, press Play |
| 5 min | Save As via file picker, confirm **All changes saved**, copy file to USB / email |

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
| Status bar | "When it says **All changes saved**, you're good" |
| **Sync pending…** | "Your strokes are waiting to copy to the local server — keep drawing, they'll save in a moment" |
| **Syncing to server…** | "Pixels are being copied to the local server right now" |
| **Not saved to file** | "Pixels are on the server but you still need **File → Save** before leaving" |

### Common student questions

| Question | Answer |
|----------|--------|
| How do I fix a mistake? | Eraser tool or `Ctrl+Z` |
| How do I get my color back? | Eyedropper (`I`), then paint |
| Why can't I paint this color? | Palette is locked — unlock or pick from swatches |
| Where is my file? | Use the path shown in the save toast; remind them to copy the `.pixelanea` file |
| Red banner at top | Click **Retry** or restart Pixelanea from the app menu / `pixelanea` |
| File picker didn't open | A manual path dialog appears instead. Students type the full path ending in `.pixelanea` — provide a template path on the board (e.g. `/home/student/Desktop/my-art.pixelanea`) or help them paste from the teacher's example |
| App crashed — did I lose work? | Strokes sync to the local server within ~½ second while drawing. **File → Save** writes the `.pixelanea` file students take home. If Pixelanea closed before sync finished, the last second of edits may be lost — remind students to watch for **All changes saved** before closing. |

## Data durability & privacy (for facilitators)

Pixelanea is **local-only** — no student accounts, no cloud upload. Use these talking points when parents or IT ask about data handling.

| Topic | What to say |
|-------|-------------|
| **Network** | The editor talks to a small program on the same computer (`127.0.0.1` only). Nothing is sent to Pixelanea's servers or the internet. |
| **Two kinds of "saved"** | (1) **Synced to the local server** — happens automatically while students draw (about every half second after they stop moving the mouse). (2) **Saved to a file** — **File → Save** / **Save As** writes the `.pixelanea` file they copy to USB. Both matter for class ending. |
| **Status bar** | **All changes saved** = file on disk is current. **Not saved to file** = pixels are in memory/server but they still need **Save** before leaving. |
| **Crash or force-quit** | Undo history lives in the app session only. If the app dies before the automatic sync finishes, the last fraction of a second of painting may not persist. Best practice: **Save** before break and before shutdown. |
| **Sharing files** | `.pixelanea` files contain art data only — safe to email or copy on USB. See [security audit](../security-audit.md) for technical detail. |

**End-of-class checklist:** each student **Save As** → status shows **All changes saved** → copy `.pixelanea` off the machine.

## If the file picker doesn't open

On some setups the native file picker may not appear (zenity missing, or browser fallback via `pixelanea-browser`). Pixelanea then shows a manual path field. Tell students to type the **full path** ending in `.pixelanea` — write a template on the board (for example `/home/student/Desktop/my-art.pixelanea`) or paste from your example file. The dialog explains that the picker didn't open; the hint under the field reminds them to ask you if they're unsure.

On Linux desktop builds, install `zenity` (`sudo apt install zenity`) and restart Pixelanea so **File → Open** and **Save As** use the native dialog. The `.deb` install path uses a native app window by default; zenity is only for file-picker dialogs, not for launching the editor.

## Native file picker QA checklist (desktop labs)

Run once per lab image before a workshop (manual — not automated):

| Step | Action | Expected |
|------|--------|----------|
| 1 | `command -v zenity` on lab machines | Installed, or install before class |
| 2 | Start **Pixelanea** without zenity | In-app notice to install zenity (or stderr hint with `pixelanea-browser`) |
| 3 | **File → Open** → pick a `.pixelanea` | Project loads; no manual path typing |
| 4 | **File → Open** → Cancel | No toast; editor unchanged |
| 5 | **File → Save As** → new path | Toast **Project saved.**; status **All changes saved** |
| 6 | **Save** on existing project | Saves in place; no path dialog |
| 7 | Zenity missing (fallback) | Manual path dialog with recovery copy; students can still save with teacher path template |
| 8 | Native window check | App menu opens Pixelanea — window has no browser URL bar or tabs |

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
- [BACKLOG.md](../../BACKLOG.md) — E2-014 workshop teacher kit (template + PDF)
