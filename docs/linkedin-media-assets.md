# LinkedIn media assets — shot list

Production brief for screen recordings and stills supporting the loop-engineering article and Pixelanea showcase posts.

**Goal:** Show real user flows — not mockups — so viewers see a local desktop pixel editor that works end to end.

---

## Before you record

| Item | Recommendation |
|------|----------------|
| **App** | Installed `.deb` native window (`pixelanea`) — looks best on LinkedIn. Fallback: `pixelanea-browser` at 1280×800 window. |
| **Display** | 1920×1080 capture; crop to 16:9 or 1:1 in post if needed. |
| **Theme** | Dark mode (reads better in feeds) unless brand prefers light. Pick one theme and use it for every asset. |
| **Clean state** | Fresh session: no old projects open, onboarding not yet dismissed for tutorial stills. |
| **Sample image (import)** | `docs/media/linkedin/fixtures/capybara-abbey-road.png` (Capybara on Abbey Road — copied from Downloads) |
| **Cursor** | Slow, deliberate moves; pause 1–2 s on key UI before clicking. |
| **Audio** | Optional soft bed music or silent — LinkedIn autoplays muted; captions on final edit help. |
| **Length target** | 30–45 s per flow video; tutorial still is one frame. |

**Output folder:**

```text
docs/media/linkedin/
  blank-project.gif
  import-capybara.gif
  animation-walk.gif
  still-01-onboarding-tutorial.png
```

**Regenerate all assets (automated):**

```bash
./scripts/record-linkedin-media.sh
```

Playwright records the UI; ffmpeg writes GIFs only. MP4/WebM intermediates are discarded and gitignored.

---

## Asset 1 — Video: New project from scratch

**Filename:** `blank-project.gif`  
**Story:** Two equal front doors → blank path → editor → first pixels → save.

| Beat | Time | Action | Frame must show |
|------|------|--------|-----------------|
| 1 | 0:00 | Launch app; land on new-project screen | Title **Start a new project**; both entry cards visible (**Start blank** / **From image**) |
| 2 | 0:05 | Click **Start blank** | Canvas size step (16–256 presets or custom) |
| 3 | 0:10 | Select **32×32**, click **Create project** | Brief loading, then editor shell |
| 4 | 0:15 | Onboarding step 1 appears — **do not skip yet** | Overlay **Pick a color** + palette panel highlighted |
| 5 | 0:18 | Click **Next** through onboarding OR dismiss after step 2 | Tour cards: **Paint your first pixel**, **Save when you're ready** |
| 6 | 0:22 | Pick a swatch; paint 4–6 pixels on canvas | Canvas with visible pixel art starting |
| 7 | 0:28 | **File → Save As**; save as `demo-sprite.pixelanea` | Save dialog + toast **Project saved.** + status **All changes saved** |
| 8 | 0:35 | Hold on editor wide shot | Tool rail, canvas, palette, status bar |

**Hero moment:** First paint stroke landing on an empty checkerboard canvas.

**Avoid:** Skipping the new-project screen; starting mid-editor with no context.

---

## Asset 2 — Video: Import from image (capybara)

**Filename:** `import-capybara.gif`  
**Story:** Capybara on Abbey Road photo → 64×64 pixel art → editor.

| Beat | Time | Action | Frame must show |
|------|------|--------|-----------------|
| 1 | 0:00 | New-project screen | Click **From image** |
| 2 | 0:04 | Drop `capybara-abbey-road.png` | Source preview |
| 3 | 0:10 | **Detail** (64×64) + **Retro** palette | Wizard steps |
| 4 | 0:18 | Preview pixelation | Capybara readable at pixel scale |
| 5 | 0:24 | **Use this result** | Editor with quantized capybara |

---

## Asset 3 — Video: Shadows + horizontal walk animation

**Filename:** `animation-walk.gif`  
**Story:** Import capybara → add shadow → select → duplicate 8 blank frames → paste and nudge right per frame → play loop.

| Beat | Action |
|------|--------|
| 1 | Import capybara (same as asset 2) |
| 2 | **Shading palettes → Dark** → paint shadow under subject |
| 3 | **Select** tool → drag around capybara + shadow → **Ctrl+C** |
| 4 | **Add frames for animation** → 8 frames → **Blank other frames** |
| 5 | Frames 2–8: **Ctrl+V** → **Arrow Right** (increasing offset) → **Enter** |
| 6 | **Play animation** — capybara walks horizontally across frames |

---

## Asset 4 — Still: User tutorial (onboarding overlay)

**Filename:** `still-01-onboarding-tutorial.png`  
**Type:** Screenshot (not video)  
**Purpose:** LinkedIn carousel card or article inline — shows the in-app guided tour.

### Primary shot (required)

| Field | Value |
|-------|--------|
| **When** | Immediately after creating a **blank** project (not import) |
| **Step** | Step 1 — **Pick a color** |
| **Visible** | Onboarding card (title + body + **Next** / **Skip tour**); palette panel on the right; empty canvas; tool rail with Paint selected |
| **Crop** | Center on overlay + palette; include enough chrome to read as a desktop app |

### Optional companion stills (carousel)

If building a 4-slide tutorial carousel, capture one PNG per onboarding step without advancing the app state between shots (re-create project four times, or use devtools/store reset):

| Slide | Overlay title | Highlight |
|-------|---------------|-----------|
| 1 | Pick a color | Palette panel |
| 2 | Paint your first pixel | Canvas center |
| 3 | Save when you're ready | File menu area |
| 4 | Try animation | Frame strip + **Add frames for animation** |

**Filenames:** `still-01-onboarding-step-01.png` … `still-01-onboarding-step-04.png`

---

## Checklist before publish

- [ ] All videos show native app window (no browser URL bar if avoidable)
- [ ] No personal file paths visible in save dialogs
- [ ] Status bar shows **All changes saved** at least once
- [ ] Resolution consistent across assets
- [ ] Tutorial still matches dark/light theme used in videos
- [ ] Exported GIFs loop cleanly; PNG still matches theme

---

## Suggested LinkedIn usage

| Asset | Post placement |
|-------|----------------|
| `blank-project.gif` | Hook clip — editor from scratch |
| `import-capybara.gif` | Import wizard / image pipeline |
| `animation-walk.gif` | Shading + frame animation |
| `still-01-onboarding-tutorial.png` | Onboarding polish |

Pair with `docs/loop-engineering-control-loop-linkedin.md` — videos show the **plant**; the article explains the **loops** around it.
