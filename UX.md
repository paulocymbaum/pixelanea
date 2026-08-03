# Pixelanea UX Guide

User experience reference for Pixelanea — who we build for, how they work, and how the product supports **fluid, creative freedom** without getting in the way.

Distilled from research workshops in [BRAINSTORM.md](./BRAINSTORM.md). Visual specs live in [DESIGN.md](./DESIGN.md).

---

## Product promise

> **Make pixel art. Keep it local.**

Pixelanea is a free, open-source, local-only pixel art editor. Users pixelate images, draw on a grid with custom palettes, undo mistakes, build 8/16/32-frame animations, and save everything in one portable `.pixelanea` file.

**Core UX bet:** Creative tools should feel like a clear workspace — not a obstacle course. The interface stays out of the way so users can experiment, fix mistakes instantly, and keep flow state while drawing.

---

## Who we build for

### Anti-personas (v1)

Pixelanea is **not** optimized for:

| Anti-persona | Why not |
|--------------|---------|
| Professional studio artists | Need layers, tilemaps, plugins, pipeline integration |
| SaaS collaboration teams | Need cloud sync, comments, multi-user versioning |
| NFT / batch automation pipelines | Need scripting APIs and headless processing |

Our differentiator is **approachable + portable + free + offline** — not "most powerful pixel editor."

---

## User personas

### Priority matrix

| Persona | Name | Priority | v1 focus |
|---------|------|----------|----------|
| Hobby Game Dev | **Riley** | Primary | Full editor + animation |
| Pixel-Curious Designer | **Casey** | Secondary | Import / pixelate wizard |
| Workshop Teacher | **Morgan** | Secondary | Clarity, offline, save/share |
| Constraint-Driven Modder | **Alex** | Tertiary | Palette lock, exact grids |
| Animation Sketcher | **Jordan** | Watch | Validate post-launch |

One shell serves all personas through **collapsible panels and sensible defaults** — not separate skins.

---

### Riley — Hobby Game Dev *(Primary)*

| | |
|---|---|
| **Age** | 24 |
| **Context** | Evenings/weekends, solo Godot developer |
| **Skill** | Intermediate — knows sprite sheets and walk cycles |
| **Goal** | Ship a playable prototype with original art this week |
| **Quote** | *"I don't need Photoshop. I need a walk cycle by Friday."* |

**Behaviors:**
- Starts blank or imports a rough sketch
- Works at 32×32 or 48×48
- Paints aggressively, erases often, duplicates to 8 frames
- Previews animation, tweaks mid-sequence frames
- Saves `.pixelanea`, exports PNG for engine

**Pain points:**
- Paid tools are a barrier
- Browser editors lose work or require accounts
- Frame management is confusing in general editors

**Jobs-to-be-done:**

| When I… | I want to… | So I can… |
|---------|------------|-----------|
| Block out a character | Draw + duplicate to 8 frames | Test a walk cycle in-engine today |

**Success metric:** 8-frame loop saved to `.pixelanea` in under 45 minutes on first visit.

**UX requirements:**
- Frame strip visible when `frameCount > 1`
- Keyboard shortcuts: colors 1–9, undo Ctrl+Z, tool keys
- "Duplicate to 8/16/32 frames" — clear, one-step with confirmation
- Animation controls adjacent to frame strip
- Skip onboarding option

---

### Casey — Pixel-Curious Designer *(Secondary)*

| | |
|---|---|
| **Age** | 31 |
| **Context** | Brand designer, retro aesthetic for client deck |
| **Skill** | Low pixel skill, high visual taste |
| **Goal** | Turn a photo into crisp pixel art in minutes |
| **Quote** | *"I want it to look intentional, not like I crushed it in Excel."* |

**Behaviors:**
- Lands on **From image** first (11/12 in testing)
- Picks resolution preset — "Icon 16×16", "Sprite 32×32"
- Adjusts palette, paints a few cleanup pixels
- Saves once, exports PNG for Figma/Slides
- Rarely uses animation

**Pain points:**
- Generic pixelate filters blur edges
- Pro tool UI is overwhelming
- Doesn't want a color theory course to start

**Jobs-to-be-done:**

| When I… | I want to… | So I can… |
|---------|------------|-----------|
| Have a logo or photo | Pixelate to 32×32 with limited palette | Drop it into a slide or mockup |

**Success metric:** Usable 32×32 result in under 5 minutes without reading docs.

**UX requirements:**
- Import wizard as **equal front door** — not buried in File menu
- Plain-language resolution presets (16×16 through 256×256)
- Curated palette suggestions (Retro, Gameboy, Monochrome, NES, Pico-8, Pastel) plus **Match my image** auto-extract (4/8/16 colors)
- Collapsible palette panel (uses ≤8 colors)
- Guided copy; icons + labels on toolbar

---

### Morgan — Workshop Teacher *(Secondary)*

| | |
|---|---|
| **Age** | 38 |
| **Context** | Middle school coding club, 90-minute sessions |
| **Skill** | Comfortable with software, not a pixel artist |
| **Goal** | Every student leaves with a sprite and a take-home file |
| **Quote** | *"If it needs an account or the Wi-Fi, it dies in my classroom."* |

**Behaviors:**
- Pre-installs on lab machines
- Distributes starter `.pixelanea` template via USB
- Students paint, erase mistakes, maybe play animation once
- Collects projects on shared drive

**Pain points:**
- Licensing and account walls in schools
- Students get lost after mis-clicks
- Mistake recovery must be obvious

**Jobs-to-be-done:**

| When I… | I want to… | So I can… |
|---------|------------|-----------|
| Lead a workshop | Open one project file on every machine | Students leave with something they made |

**Success metric:** Zero install support tickets; 80%+ students save a project.

**UX requirements:**
- No login, no cloud, no mandatory internet
- Toolbar: **icon + text label** always
- Eraser labeled "Fix mistakes" in onboarding
- Familiar Open / Save / Save As wording
- Plain-language errors
- 40×40 minimum touch targets
- 14px minimum body text (projector-readable)

---

### Alex — Constraint-Driven Modder *(Tertiary)*

| | |
|---|---|
| **Age** | 29 |
| **Context** | ROM hack Discord, fan game UI edits |
| **Skill** | High — thinks in palettes and tile boundaries |
| **Goal** | Match exact color limits and grid size for target game |
| **Quote** | *"If I can't lock the palette to 16 colors, I'm not using it."* |

**Behaviors:**
- Sets exact dimensions (e.g. 16×16 portrait)
- Defines or imports fixed palette
- Paints cell-by-cell; eyedropper constantly
- Rarely animates; cares about export fidelity

**Pain points:**
- Tools silently add off-palette colors
- No palette index visibility
- Sloppy export breaks engine importers

**Jobs-to-be-done:**

| When I… | I want to… | So I can… |
|---------|------------|-----------|
| Edit a 16-color portrait | Lock palette + paint cell-by-cell | Match game constraints exactly |

**Success metric:** 16×16 portrait using only locked 16-color palette.

**UX requirements:**
- Palette editor: add, remove, reorder
- **Palette lock** — painting snaps to palette only
- Optional color index overlay (View → Show technical info)
- Export warning if off-palette pixels exist
- Power-user density OK in status bar when enabled

*Alex is a power-user slice of Riley — no separate "modder mode."*

---

### Jordan — Animation Sketcher *(Watch persona)*

| | |
|---|---|
| **Age** | 22 |
| **Context** | Draws in Aseprite, curious about Pixelanea frames |
| **Skill** | High draw skill, low patience for new UIs |
| **Goal** | Stage and preview frames without fighting the tool |
| **Quote** | *"I'll draw elsewhere — just let me stage and preview frames."* |

**Not a v1 design target.** Track retention after frame workflow ships. If users stay, invest in PNG sequence import. If they bounce, Riley remains the anchor.

---

## Empathy map — Riley (primary)

```
         ┌─────────────────────────────────────────────┐
         │  THINKS & FEELS                             │
         │  "Art is blocking my game."                 │
         │  Impostor syndrome about pixels             │
         │  Excited when animation loops               │
         ├─────────────────────────────────────────────┤
 HEARS   │  SEES                                       │  SAYS & DOES
 "Use     │  Sprite sheets on YouTube                   │  "I'll fix it later"
  Aseprite"│  Jam games with chunky art                  │  Starts too big (128²)
         │  Godot docs showing 32×32 heroes            │  Erases a lot
         ├─────────────────────────────────────────────┤
         │  PAINS                    │  GAINS         │
         │  Tool cost                │  Fast loop      │
         │  Lost work                │  Owns the file   │
         │  Frame confusion          │  Ships prototype │
         └─────────────────────────────────────────────┘
```

---

## UX principles

### Foundational (research-backed)

| # | Principle | What it means |
|---|-----------|---------------|
| 1 | **Two front doors** | Blank canvas and import-to-pixelate are equal entry points |
| 2 | **Mistakes are cheap** | Eraser + undo always visible; no guilt modals |
| 3 | **Files you can hold** | One `.pixelanea` project — save, share, reopen without jargon |
| 4 | **Animation without film school** | 8/16/32 presets, play button, frame strip |
| 5 | **Local by design** | Privacy and classrooms are features, not footnotes |

### Creative freedom (fluid UX)

These principles define how Pixelanea supports **flow state** and experimentation:

| Principle | Implementation | Why it matters |
|-----------|----------------|----------------|
| **Zero friction to first pixel** | New project → canvas in &lt;60 seconds | Riley starts before doubt sets in |
| **Non-destructive confidence** | Eraser + unlimited undo stack (cap 500) | Morgan's students recover without panic |
| **No permission to experiment** | No "Are you sure?" on paint, color change, or frame switch | Casey tries palettes without fear |
| **Reversible at every scale** | Undo single cells; eraser for tactile correction | Matches how people actually draw |
| **Progressive disclosure** | Animation strip hidden until frames &gt;1; technical info opt-in | Casey isn't overwhelmed; Alex opts in |
| **Constraints as choice** | Palette lock is a toggle, not a mode prison | Alex locks; Riley ignores |
| **Canvas sovereignty** | UI chrome never overlaps the grid; brand colors stay out of viewport | Art belongs to the user, not the app |
| **Interrupt only when necessary** | Confirm only for: delete project, overwrite file, duplicate frames | Protect data, not ego |
| **Keyboard + pointer parity** | Every paint action reachable both ways | Power users stay in flow |
| **Persistent session memory** | Panel collapse, theme, last palette — remembered | Return feels continuous, not reset |
| **Play is one click away** | Animation preview never buried in menus | Riley sees the loop immediately — dopamine fuels iteration |

### Fluidity anti-patterns (avoid)

| Anti-pattern | Why it kills creativity |
|--------------|-------------------------|
| Modal on every tool switch | Breaks flow; feels like paperwork |
| Account wall before first paint | Abandonment; blocks Morgan's classroom |
| Auto-save to cloud only | Trust break; offline promise broken |
| Hidden undo | Users fear experimentation |
| Forced tutorial gates | Riley skips; Casey feels trapped |
| Pixelated UI chrome | Unreadable; cosplay over craft |
| 12 dockable panels | Decision fatigue; Casey bounces |
| Export-only project format | Can't share work fluidly between machines |

---

## Cross-persona design matrix

| Decision | Riley | Casey | Morgan | Alex |
|----------|-------|-------|--------|------|
| Default theme | Dark | Light | Light | Either |
| Toolbar | Icons + shortcuts | Icons + labels | Labels required | Icons + hex in status |
| Onboarding | Skippable | Import wizard | Template file | Skip |
| Palette panel | Expanded | Collapsible | Expanded | Lock toggle visible |
| Animation strip | Always show | Hidden until enabled | After "Play" demo | Rare |
| Copy tone | Concise | Guiding | Plain | Precise |
| Creative freedom lever | Shortcuts + frames | Import presets | Eraser prominence | Palette lock |

---

## Key user flows

### Flow 1 — First pixel (&lt;60 seconds)

```text
Launch → New project → Blank 32×32 → Canvas focused → Pick color → Paint
```

- No account, no wizard unless user chose "From image"
- Canvas auto-focused; palette visible
- Optional skippable 4-step overlay for Morgan's cohort (pick color → paint → save → animate)

### Flow 2 — Photo to pixel (Casey, &lt;5 minutes)

```text
Launch → From image → Drop file → Pick "Sprite 32×32" → Match my image or pick a style preset
      → Preview → Accept → Cleanup paint (optional) → Save
```

- Wizard is visual, step indicator, back button always available
- Live preview before committing pixelation
- Land directly in edit mode — no extra confirmation

### Flow 3 — Walk cycle (Riley, &lt;45 minutes)

```text
Blank 32×32 → Draw frame 0 → Duplicate to 8 frames → Edit frames 2–4
            → Play preview → Tweak → Save .pixelanea → Export PNG
```

- Duplicate action: single dialog — pick 8, 16, or 32
- Frame strip appears immediately after duplicate
- Playback does not lock editing (pause to fix)

### Flow 4 — Classroom session (Morgan)

```text
Teacher distributes template.pixelanea → Open → Paint → Eraser as needed
                                      → Save As to USB → (optional) Play animation
```

- Template opens with palette pre-filled (8 colors)
- Error: "Couldn't open file — is it a .pixelanea project?"
- Save success: "Project saved." — no confetti

### Flow 5 — Constrained edit (Alex)

```text
New 16×16 → Import/define 16-color palette → Enable palette lock
          → Paint + eyedropper → Export → Warn if off-palette pixels
```

- Lock icon visible in palette header
- Status bar shows `#RRGGBB` and index when technical info enabled

---

## Interaction patterns

### Drawing & editing

| Action | Behavior | Creative freedom note |
|--------|----------|----------------------|
| Paint | Click/drag fills cells with active color | Instant feedback, no lag |
| Eraser | Clears to transparent | Framed as "fix mistakes" |
| Undo / Redo | Ctrl+Z / Ctrl+Shift+Z; toolbar buttons | Session stack, cap 500 |
| Eyedropper | Picks canvas color into active slot | Encourages palette discovery |
| Color 1–9 | Keyboard selects palette slot | Riley stays in flow |
| Zoom | Scroll / shortcuts; grid at ≥8× | Fit-to-view default |

### Palette

| Action | Behavior |
|--------|----------|
| Select swatch | Becomes active brush color |
| Add color | Color picker → append to palette |
| Remove color | Confirm if color is in use on canvas |
| Reorder | Drag slot (v1.1) or move buttons |
| Lock | Reject off-palette paints; eyedropper still works |
| Presets | One-click apply Retro / Gameboy / Monochrome |

### Animation

| Action | Behavior |
|--------|----------|
| Duplicate frames | **Duplicate frames** on frame strip → 8, 16, or 32 frames; optional quick-start with 8 frames at create |
| Switch frame | Click thumbnail; canvas updates instantly |
| Play | Cycles frames at FPS; read-only canvas during play |
| Pause | Returns to edit mode on current frame |
| FPS | Slider 1–24; default 8 |
| Loop | Toggle; on by default |
| Onion skin | Toggle in animation player; shows previous frame at 30% opacity |

### Project I/O

| Action | Behavior |
|--------|----------|
| New | Blank or import entry cards; returning users get quick-start |
| Open | Native file picker (desktop) with `.pixelanea` filter; path dialog fallback |
| Save | Write bundle; **Project saved.** toast; status bar shows sync state |
| Save As | New path; asset type defaults to Character; overwrite confirm |
| Export | File → Export submenu: PNG (current frame), spritesheet (all frames), GIF animation |
| Import image | Pixelate wizard; File menu or home **From image** |
| Unsaved guard | Confirm before New / Open / Import when dirty |

---

## Onboarding strategy

| Segment | Approach |
|---------|----------|
| Riley | 4-step skippable overlay: pick color → paint → save → animate. Never blocks. |
| Casey | Import wizard *is* the onboarding |
| Morgan | Pre-distributed template file; teacher handout, not in-app tutorial |
| Alex | No onboarding; defaults to blank 32×32 |

**Rule:** User must reach a paintable canvas in **one click** from launch after first visit preference is stored.

---

## Success metrics

| Metric | Target | Primary persona |
|--------|--------|-----------------|
| Time to first pixel painted | &lt; 60 seconds | Riley |
| Time to first pixelated import | &lt; 5 minutes | Casey |
| Animation trial rate (of savers) | &gt; 30% | Riley |
| Save/share success without docs | &gt; 95% | Morgan |
| Workshop save rate | &gt; 80% students | Morgan |
| Off-palette export warnings understood | Qualitative | Alex |

---

## Accessibility & inclusion

| Requirement | UX impact |
|-------------|-----------|
| WCAG 2.1 AA contrast | Readable for Morgan's projector |
| 14px body minimum | Students and Casey |
| Keyboard navigation | Riley power use; motor accessibility |
| Color-blind safe tool states | Border + label, not hue alone |
| Reduced motion | No decorative animation |
| Plain language | ES/i18n-ready strings |
| No account gate | Inclusion for schools, privacy users |

---

## Content & microcopy guidelines

| Situation | Guideline | Example |
|-----------|-----------|---------|
| Success | Brief, factual | "Project saved." |
| Error | What happened + what to try | "Couldn't open this file. Is it a .pixelanea project?" |
| Empty state | One line + CTA | "Start drawing — pick a color on the left." |
| Destructive | Name the consequence | "Delete this project? This can't be undone." |
| Offline | Positive framing | "Files stay on your device." |
| Tool labels | Verb or noun, not jargon | "Fix mistakes" not "Erase layer" |

---

## Open research items

| Item | Owner | Notes |
|------|-------|-------|
| 6× persona interviews | Maya | 2 each Riley, Casey, Morgan |
| Subtitle A/B | Maya + Elena | "on your computer" vs "works offline" |
| Projector contrast test | Maya | Morgan lab, Aug 21 |
| Onion skin demand | Maya | Revisit after frame workflow ships |
| Animation Sketcher retention | Sam | Week-1 bounce rate |
| i18n priority | Maya | PT/ES teacher interviews |

---

## Related documents

| Document | Contents |
|----------|----------|
| [DESIGN.md](./DESIGN.md) | Colors, typography, logo, layout specs |
| [BRAINSTORM.md](./BRAINSTORM.md) | Workshop transcripts and debate rationale |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Frontend/backend dependencies |
