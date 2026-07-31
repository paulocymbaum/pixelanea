# BRAINSTORM: Personas, Design & Brand for Pixelanea

**Session 1:** Persona workshop — July 31, 2026  
**Session 2:** Design, libraries & brand — August 7, 2026  
**Session 3:** Brand lock — logo, typography & color — August 14, 2026  
**Participants:**

| Role | Name | Focus |
|------|------|-------|
| Product Manager | **Sam** | Scope, priorities, success metrics |
| UX Researcher | **Maya** | User behavior, jobs-to-be-done, evidence |
| UI Designer | **Jordan** | Visual language, interaction patterns, accessibility |
| Marketing Director | **Elena** *(Session 3)* | Brand positioning, launch assets, market differentiation |

**Goal of this session:** Agree on who we are building for, what problems they bring to Pixelanea, and what we are *not* optimizing for in v1.

---

## Opening

**Sam:** Thanks for making time. We have the architecture doc, we know the feature set — pixelate images, draw on a grid, custom palettes, undo, 8/16/32-frame animation, one portable `.pixelanea` file. Before we wireframe anything, I want us aligned on *people*. Who opens this app on a Tuesday night and thinks, "this is exactly what I needed"?

**Maya:** And who opens it, gets confused, and goes back to Aseprite or just screenshots their image in Paint?

**Jordan:** Or worse — who never finds it because we're designing for ourselves?

**Sam:** Exactly. Maya, you looked at the competitive landscape and some early forum threads. What patterns are you seeing?

---

## Part 1: Who is *not* our user (v1)

**Maya:** I want to start with anti-personas so we don't scope-creep. Pixelanea is local-only, open source, focused on grid editing and lightweight animation. We are **not** building for:

1. **Professional studio artists** who need layers, tilemaps, shader previews, and plugin marketplaces.
2. **SaaS teams** who need cloud sync, comments, and version history across collaborators.
3. **NFT / generative art pipelines** that need batch scripting and API automation — at least not in v1.

**Jordan:** Good. That means we don't need a dark-mode Figma clone with 40 panels. We need clarity.

**Sam:** Agreed. Our differentiator isn't "most powerful pixel editor." It's **approachable + portable + free + runs offline**. The project file you can email to a friend and they can open it — that's the hook.

**Maya:** And the pixelate-from-photo flow. That's a different entry point than "I want to draw a sprite from scratch." We might actually have two front doors.

**Jordan:** Two front doors means the first screen can't assume everyone wants a blank canvas.

---

## Part 2: Raw persona candidates

**Maya:** I drafted five candidates from interviews, Reddit threads, and itch.io comments. Let's stress-test them.

### Candidate A — *The Hobby Game Dev*

- Makes small games alone or with one friend
- Needs sprites and simple walk cycles, not cinematic animation
- Uses Godot, Unity, or PICO-8
- Pain: Aseprite costs money; browser tools don't export cleanly; animation frames are fiddly

### Candidate B — *The Pixel-Curious Designer*

- UI/graphic designer dabbling in retro aesthetics
- Starts from photos or illustrations, wants a pixel version fast
- Pain: Photoshop pixelate looks mushy; doesn't want to learn a whole craft overnight

### Candidate C — *The Teacher / Workshop Leader*

- Runs a classroom or game jam intro session
- Needs something installable, free, and hard to "break"
- Pain: licensing, accounts, internet dependency in schools

### Candidate D — *The Modder / ROM Hack Adjacent*

- Edits small tilesets, portraits, UI skins
- Very palette-conscious, cares about exact colors and grid sizes
- Pain: tools are either too simple (MS Paint) or too arcane (YY-CHR-ish workflows)

### Candidate E — *The Animation Sketcher*

- Already draws pixel art elsewhere, comes to Pixelanea mainly for 8/16/32 frame setup and preview
- Pain: splitting work across "draw here, animate there"

**Jordan:** A and B feel like different apps sharing a canvas. A wants precision and frames. B wants a magic "make it pixel" button and maybe never touches frame 2.

**Sam:** C is compelling for adoption — one teacher puts it on 30 laptops. But do we optimize onboarding for kids, or for adults who teach kids?

**Maya:** We optimize for the **teacher's mental model**, not the student's fine motor skills. Large click targets still help everyone.

**Sam:** D is niche but vocal. Palette control and resolution presets matter a lot to them.

**Maya:** E is real, but might be a *secondary* persona — someone who outgrows us for drawing but stays for animation packaging. Dangerous if we design only for them; we'd underinvest in import/pixelate.

---

## Part 3: The discussion

**Jordan:** I'm going to push on visual complexity. If we serve A, B, and C, the UI can't look like a pro tool with 12 dockable panels. It should feel like: **canvas in the center, one obvious toolbar, palette on the side.**

**Maya:** Jobs-to-be-done framing helps:

| Persona | When I… | I want to… | So I can… |
|---------|---------|------------|-----------|
| Hobby Game Dev | I'm blocking out a character | draw + duplicate to 8 frames | test a walk cycle in-engine today |
| Pixel-Curious Designer | I have a logo or photo | pixelate to 32×32 with a limited palette | drop it into a slide or mockup |
| Teacher | I'm leading a workshop | open a single project file on every machine | students leave with something they made |
| Modder | I'm editing a 16-color portrait | lock palette + paint cell-by-cell | match the game's constraints exactly |

**Sam:** The portable `.pixelanea` file is the thread across all four. That's our PM north star for "project" UX — save, share, reopen without export hell.

**Jordan:** For B, "project" might mean one image and they're done. For A, it's 32 frames and a palette. Same file format, different **default templates**.

**Maya:** Yes! New project flow shouldn't be "width × height" only. It should be:

- Blank sprite (16×16, 32×32, 64×64)
- From image (pixelate)
- Animation sheet (8 / 16 / 32 frames)

**Sam:** Love that. That's a roadmap-friendly onboarding matrix.

**Jordan:** Undo behavior — you said one tool "undoes squares they paint." Research question: do users expect **eraser** or **Ctrl+Z**?

**Maya:** Both. Eraser is discoverable for beginners; undo is expected by anyone who's used any editor. Teachers explicitly said "kids mash the wrong color and panic." Eraser is their safety net. Power users want keyboard undo.

**Jordan:** So eraser isn't a separate mental model — it's "I fix mistakes without thinking about history."

**Sam:** And we still ship full undo. Not negotiable.

---

**Maya:** Animation frames — 8, 16, or 32. I asked: why those numbers? Game devs said sprite sheet conventions and powers of two. Teachers said "8 is enough for a bounce demo." Nobody asked for 24 film frames.

**Jordan:** UI implication: frame strip at the bottom, like a film contact sheet. Click a frame, edit it. During playback, dim the strip and highlight the active frame — don't hijack the whole layout.

**Sam:** Onion skin?

**Maya:** Nice-to-have for A and E. Out of scope for v1 unless cheap. Teachers didn't know what it was.

**Jordan:** Noted. Frame numbers and a play button are mandatory.

---

**Sam:** Local-only — is that a feature or a limitation for these personas?

**Maya:** For C, it's the **primary feature**. Schools block cloud accounts. For B, neutral. For A, slightly negative if they expected auto-backup — but git exists.

**Jordan:** We should *celebrate* local in the UI copy: "Your files stay on your computer." No login screen. Ever.

**Sam:** Open source?

**Maya:** A and D care — they want to trust the tool and maybe contribute. B and C don't care as long as it's free.

---

## Part 4: Prioritization argument

**Sam:** We can't be equally perfect for everyone on day one. Rank personas for v1.

**Maya:** My recommendation:

1. **Primary:** Hobby Game Dev (A)  
2. **Secondary:** Pixel-Curious Designer (B)  
3. **Secondary:** Teacher (C)  
4. **Tertiary:** Modder (D)  
5. **Watch:** Animation Sketcher (E) — validate after frame workflow ships

**Jordan:** Works for UI too. A gives us the full tool layout. B gives us the import wizard and resolution presets. C gives us large targets, plain language, and rock-solid open/save.

**Sam:** D doesn't need a separate UI — they need **palette constraints** and **grid size discipline**. That's palette lock + preset resolutions. We can serve D without a "modder mode."

**Maya:** Agreed. D is a power-user slice of A, not a separate product.

**Jordan:** Then E is the person we don't chase in marketing, but we keep the animation player polished because it signals quality to A.

---

## Part 5: Agreed personas (v1)

### Persona 1 — Riley, the Hobby Game Dev *(Primary)*

| | |
|---|---|
| **Age** | 24 |
| **Context** | Evenings and weekends, solo dev, Godot |
| **Skill** | Intermediate — knows what a sprite sheet is |
| **Goal** | Ship a playable prototype with original art |
| **Quote** | *"I don't need Photoshop. I need a walk cycle by Friday."* |

**Behaviors:**
- Starts blank or imports a rough sketch
- Sets canvas to 32×32 or 48×48
- Paints, uses eraser liberally, duplicates to 8 frames
- Previews animation, tweaks frames 3 and 4
- Exports or screenshots for engine import

**Pain points:**
- Paid tools are a barrier
- Browser editors lose work or need accounts
- Frame management is confusing in general-purpose editors

**Success metric:** Riley creates an 8-frame loop and saves a `.pixelanea` file in under 45 minutes on first visit.

**Design implications (Jordan):**
- Frame strip always visible when `frameCount > 1`
- Keyboard shortcuts for colors 1–9
- Clear "Duplicate to 8/16/32 frames" action with confirmation
- Animation preview controls adjacent to frame strip

---

### Persona 2 — Casey, the Pixel-Curious Designer *(Secondary)*

| | |
|---|---|
| **Age** | 31 |
| **Context** | Brand designer, retro side project for a client deck |
| **Skill** | Low pixel skill, high visual taste |
| **Goal** | Turn a photo or vector export into crisp pixel art quickly |
| **Quote** | *"I want it to look intentional, not like I crushed it in Excel."* |

**Behaviors:**
- Lands on "From image" flow first
- Picks resolution preset (16, 32, 64 wide)
- Adjusts palette, maybe paints a few cleanup cells
- Saves once, exports PNG for Figma/Slides
- May never use animation

**Pain points:**
- Generic pixelate filters blur edges
- Overwhelmed by pro tool chrome
- Doesn't want to study color theory to get started

**Success metric:** Casey imports an image and gets a usable 32×32 result in under 5 minutes without reading docs.

**Design implications (Jordan):**
- **Import wizard** as a first-class entry (not buried in File menu)
- Resolution presets labeled in plain language: "Icon 16×16", "Sprite 32×32"
- Palette suggestions (retro, gameboy, monochrome) — curated defaults
- Optional "clean up" paint mode after import with obvious eraser

---

### Persona 3 — Morgan, the Workshop Teacher *(Secondary)*

| | |
|---|---|
| **Age** | 38 |
| **Context** | Middle school coding club, 90-minute sessions |
| **Skill** | Comfortable with software, not a pixel artist |
| **Goal** | Every student ends with a sprite they made and a file they can take home |
| **Quote** | *"If it needs an account or the Wi-Fi, it dies in my classroom."* |

**Behaviors:**
- Pre-installs Pixelanea on lab machines
- Distributes a starter `.pixelanea` template via USB
- Students paint, use eraser, maybe play animation once
- Collects projects on a shared drive at end of class

**Pain points:**
- Licensing and accounts in schools
- Students click wrong things and get lost
- Recovery from mistakes must be obvious

**Success metric:** Morgan runs a session with zero install support tickets and 80%+ students save a project.

**Design implications (Jordan):**
- No login, no cloud, no telemetry anxiety
- Large toolbar icons with text labels (not icons alone)
- Eraser prominent — "fix mistakes" not "erase layer"
- Open / Save / Save As use familiar wording
- Error messages in plain language: "Couldn't open file — is it a .pixelanea project?"

---

### Persona 4 — Alex, the Constraint-Driven Modder *(Tertiary / power slice of Riley)*

| | |
|---|---|
| **Age** | 29 |
| **Context** | ROM hack Discord, fan game UI edits |
| **Skill** | High — thinks in palettes and tile boundaries |
| **Goal** | Match exact color limits and grid dimensions for a target game |
| **Quote** | *"If I can't lock the palette to 16 colors, I'm not using it."* |

**Behaviors:**
- Sets exact dimensions (e.g. 16×16 portrait)
- Defines or imports a fixed palette
- Paints cell-by-cell, eyedropper constantly
- Rarely uses animation; cares about export fidelity

**Pain points:**
- Tools that silently add colors outside the palette
- No way to see which palette index a cell uses
- Sloppy export that breaks engine importers

**Success metric:** Alex completes a 16×16 portrait using only colors from a locked 16-color palette.

**Design implications (Jordan):**
- Palette editor with add/remove/reorder
- **Palette lock** mode: painting snaps to palette only
- Show active color index (optional overlay for power users)
- Export warns if pixels use non-palette colors

---

### Watch persona — Jordan the Animation Sketcher *(Post-v1 validation)*

| | |
|---|---|
| **Age** | 22 |
| **Context** | Draws in Aseprite, heard Pixelanea has good frame packaging |
| **Skill** | High draw, low patience for new UIs |
| **Goal** | Quick 16-frame preview and portable project handoff |
| **Quote** | *"I'll draw elsewhere — just let me stage and preview frames without fighting the tool."* |

**Maya:** We track whether this person stays or bounces after week one. If they stay, we invest in import from PNG sequences. If they bounce, we're fine — Riley is still happy.

**Sam:** Not a v1 design target. Noted in backlog.

---

## Part 6: Empathy map snapshot (Riley — primary)

```
         ┌─────────────────────────────────────────────┐
         │  THINKS & FEELS                             │
         │  "Art is blocking my game."                 │
         │  Impostor syndrome about pixels             │
         │  Excited when animation loops               │
         ├─────────────────────────────────────────────┤
 HEARS   │  SEES                                       │  SAYS & DOES
 "Use     │  Sprite sheets on YouTube                   │  "I'll fix it later"
  Aseprite"│  jam games with chunky art                  │  Starts too big (128²)
         │  Godot docs showing 32×32 heroes            │  Erases a lot
         ├─────────────────────────────────────────────┤
         │  PAINS                    │  GAINS         │
         │  Tool cost                │  Fast loop      │
         │  Lost work                │  Owns the file   │
         │  Frame confusion          │  Ships prototype │
         └─────────────────────────────────────────────┘
```

---

## Part 7: UX principles (consensus)

**Maya:** From this session, I'd propose five research-backed principles:

1. **Two front doors** — Blank canvas *and* import-to-pixelate are equal citizens.
2. **Mistakes are cheap** — Eraser + undo always visible; no modal guilt.
3. **Files you can hold** — One `.pixelanea` project; save/share/reopen without jargon.
4. **Animation without film school** — 8/16/32 presets, play button, frame strip.
5. **Local by design** — Privacy and classrooms are features, not footnotes.

**Jordan:** Visual translation:

- Center-weighted layout (canvas is the hero)
- Toolbar: max 6–8 tools in v1
- Palette always visible while drawing
- Motion only where it helps (frame highlight on play, not decorative transitions)
- Accessible contrast; don't rely on color alone for active tool state

**Sam:** PM translation — v1 success looks like:

| Metric | Target |
|--------|--------|
| Time to first pixel painted | < 60 seconds |
| Time to first pixelated import | < 5 minutes |
| % users who try animation (of those who save) | > 30% |
| Save/share success rate | > 95% without support docs |

---

## Part 8: Open questions for next session

**Maya:**
- Do we run 5 user tests with Riley prototypes before palette editor depth?
- Should we interview teachers in PT/ES markets for i18n priority?

**Jordan:**
- Dark mode for evening devs (Riley) or light mode for classrooms (Morgan) — default?
- Do we show grid lines by default or only on zoom?

**Sam:**
- Is GIF export v1 or v1.1? Riley will ask; Casey won't care.
- Name: "Pixelanea" — does Casey understand it, or do we need a subtitle? ("Pixel art editor — local & free")

**Maya:** Subtitle test in next hallway study.

**Jordan:** "Local & free" might scare Casey into thinking it's unfinished. Maybe "Simple pixel art, on your computer."

**Sam:** Copy test. Parking lot.

---

## Summary

| Persona | Priority | v1 focus |
|---------|----------|----------|
| **Riley** — Hobby Game Dev | Primary | Full editor + animation frames |
| **Casey** — Pixel-Curious Designer | Secondary | Import / pixelate wizard + presets |
| **Morgan** — Workshop Teacher | Secondary | Clarity, eraser, open/save, offline |
| **Alex** — Modder | Tertiary | Palette lock + exact grid sizes |
| **Jordan** — Animation Sketcher | Watch | Validate after launch |

**Next steps:**
1. Maya — 6× 45-min interviews (2 per primary/secondary persona)
2. Jordan — Low-fi wireframes for new project flow + frame strip
3. Sam — PRD v1 scoped to Riley + Casey paths; Morgan as NFR (accessibility, copy)

---

*This document is a working artifact. Personas should be validated with real users before major visual design lock.*

---

# Session 2: Design Aspects, Libraries & Brand

**Date:** August 7, 2026  
**Participants:** Sam (PM), Maya (UX Researcher), Jordan (UI Designer)  
**Goal:** Turn personas into a visual language — layout, typography, component choices, brand colors, and whether "Pixelanea" is the name we ship.

---

## Opening — picking up from last week

**Sam:** We left three things hanging: dark vs light default, the subtitle, and whether "Pixelanea" lands with Casey. Today I want visual direction locked enough for Jordan to start a design system, and library choices that won't fight the C++ backend architecture.

**Jordan:** I brought mood boards. Two directions — call them **Workshop** and **Night Jam**.

**Maya:** I brought naming reactions from the hallway tests. Spoiler: nobody mispronounced "Pixelanea," but half of them thought it was a Spanish learning app.

**Sam:** …Great. Let's get into it.

---

## Part 9: Brand name debate

**Sam:** Working title is **Pixelanea**. Repo, architecture doc, file extension `.pixelanea` — we're embedded. But is it the *product* name?

**Maya:** Hallway test, n = 12, mostly Casey and Riley types:

| Name | Reactions | Confusion |
|------|-----------|-----------|
| **Pixelanea** | "Sounds pretty" / "Like a place" | 4/12 thought education or wellness app |
| **Pixelanea — Simple pixel art** | Immediate clarity | 0/12 wrong category; 2/12 said subtitle feels long |
| **Gridloom** | "Sounds like a weaving tool" | Crafty, not gamey |
| **Spritebench** | Riley loved it | Casey: "Is this for testing?" |
| **Localpixel** | Clear, boring | Trustworthy but forgettable |
| **Pixelfolio** | Portfolio vibes | Implies gallery, not editor |

**Jordan:** I like Pixelanea aesthetically — the `-anea` suffix feels like a studio or a garden where pixels grow. But Maya's right: Casey needs a descriptor on first contact.

**Sam:** Product name options on the table:

1. **Pixelanea** (keep) + subtitle  
2. **Pixelanea Studio** (heavier, more "pro")  
3. Rebrand before public beta  

**Maya:** Research vote: **keep Pixelanea** as the brand, add a functional subtitle everywhere we market to Casey:

> **Pixelanea** — *Pixel art editor on your computer*

Short in the app shell: just **Pixelanea**. Long on the website and installer.

**Jordan:** File extension stays `.pixelanea` either way. That's actually a nice brand anchor — "send me the pixelanea file" is distinctive.

**Sam:** Riley asked if it was related to Aseprite. I said no. He shrugged and kept going. Name isn't blocking devs.

**Maya:** Morgan couldn't spell it but found it in the Start Menu because we used a pixel-grid icon. **Icon matters more than etymology** for teachers.

**Jordan:** Agreed. Logo is a 4×4 grid mark with one "active" cell — reads at 16px favicon size.

### Decision — naming

| Item | Choice |
|------|--------|
| Product name | **Pixelanea** |
| Subtitle (marketing / first-run) | *Pixel art editor on your computer* |
| Project file | `.pixelanea` |
| Internal codename | unchanged |
| Rebrand | deferred until post-beta unless user testing flips |

---

## Part 10: Brand personality & characteristics

**Maya:** Before colors, let's agree on **who Pixelanea is as a brand** — not who Riley is, but how the app *speaks*.

**Jordan:** I wrote five characteristics. Tell me if they match research.

| Characteristic | Meaning | Not this |
|----------------|---------|----------|
| **Approachable** | Plain words, forgiving flows | Dumbed down, childish |
| **Grounded** | Local files, no hype, no crypto | Gloomy, paranoid |
| **Crafted** | Intentional pixels, crisp UI | Sloppy retro cosplay |
| **Quietly playful** | Small delights, not mascots | Clown emoji energy |
| **Respectful of focus** | Canvas-first, minimal chrome | Sterile enterprise |

**Maya:** Riley wants "quietly playful." Morgan wants "approachable." Casey wants "crafted" — she said "it should feel like a nice notebook, not a game engine."

**Sam:** "Respectful of focus" is our anti-scope brand rule. We don't add social feeds because the brand isn't about community performance.

**Jordan:** Voice examples:

| Context | On-brand | Off-brand |
|---------|----------|-----------|
| Save success | "Project saved." | "Awesome sauce! 🎉" |
| Error | "Couldn't open this file. Is it a .pixelanea project?" | "Error 0x4F2C" |
| Empty canvas | "Start drawing — pick a color on the left." | "Your canvas awaits, creator!" |
| Offline | "Works without internet. Files stay on your device." | "No cloud required!!!" |

**Maya:** I'll run a copy test with Morgan's teacher cohort on the error strings. Plain language scored 9/10; dev jargon scored 3/10.

---

## Part 11: Brand colors

**Jordan:** Two palettes. We need to pick a default theme and whether dark mode is day-one.

### Direction A — *Workshop Light* (Morgan-first)

Warm paper-like UI. Classroom-friendly, high contrast, friendly without being juvenile.

| Token | Hex | Use |
|-------|-----|-----|
| `bg-canvas` | `#E8E4DC` | App background (warm gray) |
| `bg-surface` | `#F7F5F0` | Panels, toolbar |
| `bg-elevated` | `#FFFFFF` | Modals, dropdowns |
| `border` | `#C9C4B8` | Grid chrome, dividers |
| `text-primary` | `#1A1A1E` | Body text |
| `text-secondary` | `#5C5A62` | Hints, labels |
| `accent` | `#3D6B5E` | Primary buttons, active tool — **moss green** |
| `accent-hover` | `#2F5549` | Hover state |
| `accent-muted` | `#D4E4DE` | Selected item background |
| `danger` | `#B84A3A` | Destructive actions (rare) |
| `focus-ring` | `#3D6B5E` @ 2px | Keyboard focus |

**Jordan:** Moss green avoids the "gamer RGB" cliché and doesn't compete with user artwork. Casey said it feels "calm and professional."

### Direction B — *Night Jam Dark* (Riley-first)

Low glare for evening sessions. Higher contrast on the canvas checkerboard.

| Token | Hex | Use |
|-------|-----|-----|
| `bg-canvas` | `#121214` | App background |
| `bg-surface` | `#1C1C21` | Panels |
| `bg-elevated` | `#26262D` | Modals |
| `border` | `#3A3A44` | Dividers |
| `text-primary` | `#EDEDEF` | Body |
| `text-secondary` | `#9B99A4` | Hints |
| `accent` | `#7EB89A` | Soft mint-green accent |
| `accent-hover` | `#9DD4B4` | Hover |
| `accent-muted` | `#1E3329` | Selected background |
| `danger` | `#E07060` | Destructive |
| `focus-ring` | `#7EB89A` | Focus |

**Maya:** In testing, Riley strongly preferred dark. Morgan's students had **no preference** if contrast stayed high. Casey preferred light — "feels like a design tool."

**Sam:** Ship both, default to…?

**Jordan:** **System preference** on first launch, with a toggle in settings. If we must pick one installer default: **light** for school deployments, with a first-run card: "Prefer dark? Switch anytime."

**Maya:** Research compromise: default follows OS, remember last choice. Morgan's lab image can force light via config file later — out of scope for v1.

### Accent color debate

**Sam:** Why green? Aseprite is purple-ish. Piskel is blue. Lospec is red/black.

**Jordan:** Green reads as **growth / garden** (Pixelanea as a place) and stays neutral against most sprite palettes. Purple/blue are saturated on UI chrome and fight game-art previews.

**Maya:** Accessibility: moss `#3D6B5E` on `#F7F5F0` passes WCAG AA for large text; for small labels we use `#2F5549` or bump weight.

### Canvas-specific colors (not brand — functional)

| Token | Value | Purpose |
|-------|-------|---------|
| `checker-a` | `#CCCCCC` / `#2A2A30` | Transparency background |
| `checker-b` | `#FFFFFF` / `#1F1F24` | Transparency background |
| `grid-line` | `rgba(0,0,0,0.08)` / `rgba(255,255,255,0.06)` | Cell borders when zoomed |
| `onion-skin` | `rgba(125,184,154,0.25)` | Future overlay |
| `active-frame` | accent border 2px | Frame strip highlight |

**Jordan:** User palette swatches always use **their** colors at full saturation. Brand colors never appear inside the canvas viewport — keeps art honest.

### Decision — color

| Item | Choice |
|------|--------|
| Primary accent | Moss green (light) / Mint (dark) |
| Themes | Light + Dark, v1 |
| Default | Follow OS, persist user choice |
| Canvas | Neutral checkerboard; brand stays in chrome |

---

## Part 12: Typography & iconography

**Jordan:** Typography split — **UI sans** + **data mono**.

| Role | Font | Fallback | Why |
|------|------|----------|-----|
| UI headings & body | **Outfit** | system-ui, sans-serif | Geometric, friendly, not corporate |
| Code, dimensions, coords | **JetBrains Mono** | ui-monospace | "32×32", frame numbers, hex values |
| Avoid | Press Start 2P, VT323 | — | Too on-the-nose; hurts readability for Morgan |

**Maya:** Teachers need 14px minimum body. Riley wants dense panels — 13px is fine for secondary labels if contrast holds.

**Jordan:** Icon style: **outline icons, 1.5px stroke**, 20×20 inside 24×24 touch target. Label below icon in toolbar (Morgan requirement). Lucide is the set — consistent, open license, React-friendly.

**Sam:** Custom icons for paint/eraser/frame?

**Jordan:** Lucide has `pencil`, `eraser`, `grid-3x3`, `play`. Custom only for **pixel-specific** actions: "duplicate to 8 frames" gets a bespoke sprite-sheet icon.

---

## Part 13: Layout & design aspects

**Jordan:** Wireframe principles — the **editor shell**:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [logo]  File  Edit  View          [project name]    [theme] ⓘ │
├────────┬────────────────────────────────────────────┬───────────┤
│        │                                            │           │
│ Tools  │                                            │  Palette  │
│ +      │              CANVAS (hero)                 │  swatches │
│ labels │                                            │  + editor │
│        │                                            │           │
├────────┴────────────────────────────────────────────┴───────────┤
│  Frame strip  [1][2][3]...[8]     ▶  8 fps  loop              │
└─────────────────────────────────────────────────────────────────┘
```

**Maya:** Riley needs frame strip always visible when animating. Casey needs palette collapsible — she uses 8 colors max.

**Jordan:** Collapsible right panel, remembered per session. Canvas min-width 60% viewport.

**Design aspects checklist:**

| Aspect | Spec |
|--------|------|
| Spacing scale | 4px base — 4, 8, 12, 16, 24, 32 |
| Border radius | 6px panels, 4px buttons, 2px swatches |
| Elevation | Flat — borders over shadows (except modals: soft shadow) |
| Motion | 150ms ease for panel toggle; 0ms for tool switch |
| Touch targets | 40×40 minimum (Morgan) |
| Zoom | 25%–3200% stepped; fit-to-view default |
| Grid | Off at fit zoom; on at ≥8× |
| Selection | Active tool: accent bg + label bold + left border 3px |
| Empty states | Illustration-free — one sentence + primary CTA |

**Sam:** New project screen — two big cards?

**Jordan:** Yes. **Start blank** and **From image** equal size. Animation template is a third card or a toggle on blank: "Make this an animation (8/16/32 frames)."

**Maya:** Casey clicked "From image" first 11/12 times. Riley clicked blank 7/10. Confirms two front doors.

---

## Part 14: UI libraries & frontend stack (design lens)

**Sam:** DEPENDENCIES.md says React, Vite, Zustand, no heavy UI kit. Jordan — what do you actually want?

**Jordan:** I want **control** over pixel-perfect chrome. Big kits (MUI, Ant) fight custom density and add bloat. Recommendation:

### Adopt

| Library | Role | Design rationale |
|---------|------|------------------|
| **React + Vite** | Shell | Fast HMR; Jordan can iterate mockups in code |
| **Zustand** | Editor state | Tool/color/frame without Redux ceremony |
| **Tailwind CSS** | Styling | Design tokens map to `tailwind.config` — single source for light/dark |
| **class-variance-authority (cva)** | Component variants | Button/tool states stay consistent |
| **Radix UI Primitives** | Dialog, dropdown, tooltip, slider | Accessible, unstyled — we apply brand |
| **Lucide React** | Icons | Stroke matches our icon spec |
| **@fontsource/outfit** + **@fontsource/jetbrains-mono** | Fonts | Self-hosted, offline-first (Morgan) |

### Avoid (v1)

| Library | Why skip |
|---------|----------|
| MUI / Chakra / Mantine | Opinionated look; hard to feel "crafted" |
| Styled-components | Runtime cost; Tailwind faster for token theming |
| Framer Motion | Overkill; CSS transitions enough |
| Konva / Pixi | Canvas is raw HTML Canvas 2D — art layer separate from UI |
| React DnD | Frame reorder not in v1 |

**Maya:** Radix tooltips with 500ms delay for Riley shortcuts — not instant hover spam for Casey.

**Jordan:** Tailwind `darkMode: 'class'` tied to theme store. Tokens:

```js
// tailwind.config — excerpt (design reference)
colors: {
  surface: { DEFAULT: '#F7F5F0', dark: '#1C1C21' },
  accent:  { DEFAULT: '#3D6B5E', dark: '#7EB89A' },
}
```

**Sam:** Does Tailwind conflict with "no CDN, offline"?

**Jordan:** No — built at compile time. Fonts via `@fontsource` packages, not Google CDN. Aligns with local-first story.

### Canvas rendering (not a UI library)

| Piece | Approach |
|-------|----------|
| Pixel board | Raw `<canvas>` + `requestAnimationFrame` |
| HiDPI | `devicePixelRatio` scaling |
| Input | Pointer events → grid cell coords |
| Preview player | Same renderer, `readOnly` flag |

**Jordan:** UI is React; art is Canvas. Never mix DOM buttons on top of individual pixels — performance and hit-testing hell.

---

## Part 15: Cross-persona design matrix

**Maya:** Map personas to design decisions so we don't argue again in PR review.

| Decision | Riley | Casey | Morgan | Alex |
|----------|-------|-------|--------|------|
| Default theme | Dark | Light | Light | Either |
| Toolbar | Icons + shortcuts | Icons + labels | Labels required | Icons + hex in status |
| Onboarding | Skip option | Import wizard | Template file | Skip |
| Palette panel | Expanded | Collapsible | Expanded | Lock toggle visible |
| Animation strip | Always show | Hidden until enabled | Show after "Play" demo | Rare use |
| Copy tone | Concise | Guiding | Plain | Precise |

**Sam:** v1 builds **one shell** with collapsible panels — not four skins.

**Jordan:** Correct. Personas inform defaults and visibility, not separate themes.

---

## Part 16: Logo & marketing visuals

**Jordan:** Logo concepts:

1. **Grid Mark** — 4×4 squares, one accent cell. Works at favicon.  
2. **Wordmark** — "Pixelanea" in Outfit Semibold, "Pixel" slightly heavier.  
3. **No mascot** — unanimous. Owls and robots are tired.

**Maya:** App store / GitHub README hero: screenshot of the editor with a friendly 16×16 sprite — **user art as hero**, not abstract branding.

**Sam:** Brand colors in marketing site can be bolder than the app — 10% more saturation on accent for screenshots and README banner.

**Jordan:** Marketing site is a separate concern. App stays calm; website can have one loud gradient hero.

---

## Part 17: Accessibility & internationalization

**Maya:** NFRs that affect design now:

| Requirement | Implementation |
|-------------|----------------|
| WCAG 2.1 AA contrast | Token pairs pre-checked |
| Keyboard navigation | All tools tabbable; shortcuts documented in `?` overlay |
| Focus visible | 2px accent ring, never `outline: none` without replacement |
| Color-blind safe | Active tool uses border + icon fill, not color alone |
| Reduced motion | `prefers-reduced-motion` disables panel animations |
| i18n-ready | Strings externalized; layout allows +30% German width |

**Jordan:** Status bar shows coordinates and color hex for Alex without cluttering Casey's view — toggle "Show technical info" in View menu.

---

## Part 18: The argument — "does it feel like a pixel app?"

**Sam:** Last question. Should the *chrome* be pixelated too? Pixel borders, 8-bit font?

**Jordan:** Hard no. Retro UI is charming for 30 seconds, then Morgan can't read labels. **The canvas is pixel art. The app is modern.**

**Maya:** Users said: "I want the art to be retro, not the buttons."

**Sam:** Sold. Crafted, not cosplay.

**Jordan:** Subtle nod: 2px sharp corners on swatches, crisp 1px borders, integer spacing. Digital honesty without costume.

---

## Part 19: Decisions summary (Session 2)

| Topic | Decision |
|-------|----------|
| **Name** | Pixelanea + subtitle *Pixel art editor on your computer* |
| **Personality** | Approachable, grounded, crafted, quietly playful, focus-first |
| **Accent** | Moss green (light) / mint (dark) |
| **Themes** | Light + dark; default OS; persist choice |
| **Typography** | Outfit (UI) + JetBrains Mono (data) |
| **Icons** | Lucide + 1–2 custom pixel workflow icons |
| **CSS** | Tailwind + CVA + Radix primitives |
| **State** | Zustand |
| **Canvas** | Raw HTML Canvas 2D |
| **Layout** | Center canvas, left tools, right palette, bottom frame strip |
| **Chrome aesthetic** | Modern flat; retro only inside canvas |
| **Fonts/icons hosting** | Self-hosted (`@fontsource`, bundled icons) — offline-safe |

---

## Part 20: Open questions (carried forward)

**Jordan:**
- Finalize Grid Mark logo in SVG for favicon + About screen
- Design tokens PR: `packages/ui` or `apps/web/src/styles/tokens.css`?

**Maya:**
- A/B subtitle on landing page: "on your computer" vs "works offline"
- Contrast audit with real projector (Morgan's lab use case)

**Sam:**
- GitHub README banner — who illustrates the sample sprite?
- v1.0 press kit: name, colors, one screenshot, one paragraph

**Maya:** Can we call the green **Pixelanea Moss** internally? It's growing on me.

**Jordan:** Only if Sam puts it in the brand guide.

**Sam:** Session 3: brand guide PDF. Maybe.

---

## Combined next steps

| Owner | Task |
|-------|------|
| Jordan | Figma → code tokens in Tailwind; editor shell wireframe hi-fi |
| Maya | 6 interviews + subtitle A/B; projector contrast test |
| Sam | PRD design section; approve name + subtitle for README |
| Eng | Scaffold `apps/web` with Tailwind, Radix, font packages per DEPENDENCIES.md |

---

*Session 2 complete. Design tokens and naming should be validated in usability testing before marketing site launch.*

---

# Session 3: Brand Lock — Logo, Typography & Color

**Date:** August 14, 2026  
**Participants:** Sam (PM), Maya (UX Researcher), Jordan (UI Designer), **Elena (Marketing Director)**  
**Goal:** Final consensus on logo system, typography rules, and color palette for app + marketing. No more "maybe" — ship a brand guide.

---

## Opening — the marketing lens

**Elena:** I've read Sessions 1 and 2. Love the personas. But I can't write a press release around "moss green" and a 4×4 grid we haven't locked. Before GitHub stars and itch.io launch, I need three things: **a logo that scales**, **type that reads in a tweet**, and **colors that look intentional on a banner — not like a dev tool that picked a theme in Tailwind.**

**Jordan:** Fair. I brought three logo directions in Figma.

**Maya:** I brought competitive screenshots — Aseprite, Piskel, LibreSprite, Pixaki, Dot — and how they show up at 32×32 favicon size.

**Sam:** Ground rule: nothing we agree today breaks the app UX from Session 2. Elena, you get louder marketing; Jordan keeps calm product chrome.

**Elena:** Deal. But the marketing site can be **10% bolder** than the app — you already said that. I want that in writing.

**Sam:** Written.

---

## Part 21: Logo — three directions, one winner

**Jordan:** Three concepts on the table:

### Concept A — *Grid Mark* (Session 2 favorite)

4×4 pixel grid. Seven cells in neutral gray; one cell in accent green (bottom-right). No letterforms.

```
■ ■ ■ ■
■ ■ ■ ■
■ ■ ■ ■
■ ■ ■ ■  ← one cell = accent (the "active pixel")
```

**Pros:** Reads at 16px. Timeless. Works as favicon, app icon, watermark.  
**Cons:** Generic "pixel app" territory. Lospec, some jam sites use similar marks.

---

### Concept B — *P·Mark* (monogram)

Stylized **P** built from 5 square blocks — negative space suggests a grid. Accent dot = the counter of the P.

**Pros:** More ownable. Says "Pixelanea" without spelling it. Distinct in a tab bar next to other tools.  
**Cons:** Harder at 16px; needs simplification for favicon.

---

### Concept C — *Garden Frame*

Grid Mark sits inside a soft rounded square — "a plot of land" (Pixel**anea** as place). Subtle 2px inset border.

**Pros:** Elena likes it for app store icon — feels finished, not raw.  
**Cons:** Rounded container adds visual noise at tiny sizes.

---

**Elena:** B for brand recognition. A for practicality. C for App Store.

**Maya:** Hallway flash test, 20 people, 3 seconds each:

| Mark | "What is this?" correct | "Would you click?" |
|------|-------------------------|---------------------|
| A — Grid | 35% said "pixel art" | 62% |
| B — P·Mark | 45% said "pixel art" | 71% |
| C — Garden Frame | 40% said "pixel art" | 68% |

**Maya:** B wins recognition. But when scaled to favicon, 8/20 couldn't tell B from a generic app icon.

**Jordan:** Hybrid proposal: **B·Mark at 32px and above. A·Grid Mark at 16px favicon.** Same accent cell position in both — visual DNA.

**Elena:** That's two logos.

**Jordan:** One logo system, two **optical sizes**. Apple does it — detailed icon, simplified glyph.

**Sam:** Engineering cost?

**Jordan:** Two SVGs. `logo-full.svg` (P·Mark), `logo-glyph.svg` (Grid Mark). Same color tokens.

**Elena:** …I can live with that if the wordmark always accompanies the full mark on marketing.

### The wordmark debate

**Elena:** "Pixelanea" needs to carry the brand on README banners and Twitter. The icon alone won't.

**Jordan:** Wordmark spec:

| Element | Rule |
|---------|------|
| Typeface | **Outfit SemiBold** (600) |
| Case | **Pixelanea** — capital P only, rest lowercase |
| Letter-spacing | `-0.02em` (slightly tight — feels intentional) |
| **Pixel** | Same weight — no split color in v1 (tested gimmicky) |
| **-anea** suffix | Same color as "Pixel" — unity over fragmentation |

**Elena:** I wanted **Pixel** in near-black and **anea** in moss green.

**Maya:** Split-color test: Casey liked it ("feels designed"). Riley neutral. Morgan found it "hard to read on the projector."

**Jordan:** Compromise: split color **only on marketing hero**, never in app chrome or error dialogs. Product UI = solid `text-primary` wordmark.

**Elena:** Fine. Marketing gets the split. App stays accessible.

**Sam:** Locked?

**All:** Locked.

### Logo clear space & misuse

**Jordan:**

| Rule | Value |
|------|-------|
| Clear space | 1× cap height on all sides |
| Minimum size (full lockup) | 120px wide digital |
| Minimum size (glyph only) | 16px |
| Don't | Stretch, rotate, add glow, put on busy photos without scrim |
| Do | Use glyph on solid `bg-surface` or `#1A1A1E` dark hero |

### Decision — logo system

| Asset | Mark | Use |
|-------|------|-----|
| `logo-lockup.svg` | P·Mark + "Pixelanea" | Website header, README, press kit |
| `logo-mark.svg` | P·Mark only | App About, social avatar |
| `logo-glyph.svg` | 4×4 Grid Mark | Favicon, taskbar 16px, file association |
| `logo-wordmark.svg` | Text only | Footer, narrow banners |

**Active pixel position:** bottom-right cell in glyph; top-left of P-counter in P·Mark. **Same semantic:** "the pixel you're working on."

---

## Part 22: Typography — product vs marketing

**Elena:** Outfit is nice. My worry: it's trending. In two years every indie tool looks like Outfit on a beige background.

**Jordan:** Alternatives I tested:

| Font | Vibe | Elena | Maya | Jordan |
|------|------|-------|------|--------|
| **Outfit** | Friendly geometric | "Safe" | Readable ✓ | On-brand ✓ |
| **DM Sans** | Neutral pro | "Fintech" | ✓ | Too cold |
| **Plus Jakarta Sans** | Startup 2024 | "SaaS" | ✓ | Close second |
| **Sora** | Tech-calm | "Distinct" | ✓ | Slightly sharp |
| **IBM Plex Sans** | Trustworthy | "Enterprise" | ✓ | Wrong persona |

**Maya:** Sora vs Outfit — no significant difference in comprehension tests. Outfit wins on **number legibility** at small sizes (frame counts, dimensions).

**Elena:** What about the word "Pixelanea" in marketing headlines — can we use something with more character?

**Jordan:** **Display vs UI split:**

| Context | Font | Weight | Size range |
|---------|------|--------|------------|
| App UI (all screens) | **Outfit** | 400 body, 500 labels, 600 headings | 13–24px |
| Marketing H1/H2 only | **Sora** | 600–700 | 32–56px |
| Data / coords / hex | **JetBrains Mono** | 400, 500 for emphasis | 12–14px |

**Elena:** Two sans families is a lot.

**Jordan:** Marketing site is 4 pages. App is the product. Sora appears in **hero headlines only** — max 3 instances per page. Everything else Outfit.

**Sam:** Bundle size? We're offline-first.

**Jordan:** `@fontsource/sora` — Latin subset, 600 weight only. ~18KB. Marketing site can lazy-load; app doesn't ship Sora at all.

**Elena:** App doesn't need Sora. Sold.

### Typography scale (final)

**Jordan:**

| Token | Font | Size | Weight | Line height | Use |
|-------|------|------|--------|-------------|-----|
| `text-xs` | Outfit | 12px | 400 | 16px | Timestamps, tertiary |
| `text-sm` | Outfit | 13px | 400 | 18px | Secondary labels |
| `text-base` | Outfit | 14px | 400 | 20px | Body (Morgan minimum) |
| `text-md` | Outfit | 16px | 500 | 24px | Toolbar labels |
| `text-lg` | Outfit | 18px | 600 | 26px | Panel headings |
| `text-xl` | Outfit | 24px | 600 | 32px | Dialog titles |
| `text-mono` | JetBrains Mono | 13px | 400 | 18px | Coords, hex, FPS |
| `text-display` | Sora | 40–48px | 600 | 1.1 | Marketing hero only |

**Maya:** 14px body minimum — non-negotiable for Morgan. Riley's dense panels use 13px only for **secondary** metadata.

**Elena:** Tagline under hero — Outfit 18px regular, not Sora. Taglines shouldn't shout.

### Decision — typography

| Layer | Font |
|-------|------|
| App (entire) | Outfit + JetBrains Mono |
| Marketing hero | Sora |
| Marketing body | Outfit |
| Mono / data | JetBrains Mono everywhere |

---

## Part 23: Color — the marketing fight

**Elena:** Moss green `#3D6B5E` is sophisticated. It's also **invisible** on a GitHub trending page next to neon gradients. I need a **marketing accent** that photographs well.

**Jordan:** Product accent stays moss. Marketing can use a **spectrum**, not a different hue family.

**Elena:** Show me.

**Jordan:** Four tensions on the board:

### Tension 1 — Green temperature

| Swatch | Hex | Name | Votes |
|--------|-----|------|-------|
| Current | `#3D6B5E` | Pixelanea Moss | Jordan, Maya (product) |
| Warmer | `#4A7C59` | Garden Green | Elena (marketing) |
| Cooler | `#356B63` | Slate Moss | — rejected, muddy |
| Brighter | `#5A9E78` | Sprout | Riley types in dark mode tests |

**Maya:** Warmer green `#4A7C59` passes WCAG AA on `#F7F5F0` for buttons. Moss `#3D6B5E` passes for large text only at 14px — we were already bumping weight.

**Jordan:** If we shift product primary to `#4A7C59`, dark mode mint needs retuning to match family.

**Elena:** I don't want a rebrand every six months. Pick one green.

**Sam:** Can we unify on **one primary green** that works product + marketing?

**Jordan:** Revised primary: **`#3F6F5A`** — splits the difference. Call it **Pixelanea Green**. Slightly warmer than Moss, still grounded.

| Token | Light | Dark |
|-------|-------|------|
| `accent` | `#3F6F5A` | `#82C4A6` |
| `accent-hover` | `#325A48` | `#9DD4B8` |
| `accent-muted` | `#D8EBE2` | `#1E3329` |
| `accent-marketing` | `#3F6F5A` → `#5AAF82` gradient | Hero banners only |

**Elena:** Gradient on marketing hero?

**Jordan:** **Linear 135°**, `#3F6F5A` → `#5AAF82`, subtle. App buttons stay flat — no gradient in product UI.

**Maya:** Gradient text for "Pixelanea" on hero — Casey liked; Morgan said "fancy." Optional, off by default for accessibility — use solid green text with gradient background instead.

**Elena:** Solid wordmark, gradient background. Locked.

---

### Tension 2 — Neutrals: warm paper vs cool gray

**Jordan:** Session 2 warm paper `#F7F5F0` — crafted, notebook.

**Elena:** On marketing photography and MacBook mockups, warm paper looks **yellow** next to Apple's cool grays.

**Maya:** Side-by-side test: warm wins for "approachable" (+12%). Cool wins for "professional" (+8%). Casey = warm. Riley = no preference.

**Jordan:** Compromise neutrals — **warmth reduced 30%:**

| Token | Session 2 | **Final** |
|-------|-----------|-----------|
| `bg-canvas` | `#E8E4DC` | `#E6E6E8` |
| `bg-surface` | `#F7F5F0` | `#F4F4F6` |
| `bg-elevated` | `#FFFFFF` | `#FFFFFF` |
| `border` | `#C9C4B8` | `#D1D1D6` |
| `text-primary` | `#1A1A1E` | `#18181B` |
| `text-secondary` | `#5C5A62` | `#52525B` |

**Elena:** Cooler. Still not sterile.

**Jordan:** Dark neutrals unchanged — already balanced.

---

### Tension 3 — Secondary accent for marketing CTAs

**Elena:** One green isn't enough for "Download" vs "Learn more" hierarchy.

**Jordan:** Secondary = **ink**, not a second hue.

| Role | Light | Dark |
|------|-------|------|
| Primary CTA | `accent` fill, white text | `accent` fill, `#18181B` text |
| Secondary CTA | `text-primary` outline | `border` outline |
| Tertiary / link | `accent` underline on hover | `accent` text |

**Elena:** No orange "Sign up" button?

**Sam:** We're open source. One CTA: **Download**. Secondary: **View on GitHub**. No funnel rainbow.

**Elena:** Fine. Discipline is on-brand for "grounded."

---

### Tension 4 — The `-anea` suffix color (marketing wordmark)

**Elena:** Split wordmark: **Pixel** in `#18181B`, **anea** in `#3F6F5A`.

**Jordan:** Only on marketing lockup. Minimum size 80px wide or split becomes illegible — fall back to solid black.

**Maya:** Works in hero. Fails on embroiled backgrounds — always on solid or 60% scrim.

### Decision — color system (final)

| Name | Hex | Use |
|------|-----|-----|
| **Pixelanea Green** | `#3F6F5A` | Primary accent (product + marketing) |
| **Pixelanea Mint** | `#82C4A6` | Dark mode accent |
| **Sprout** | `#5AAF82` | Gradient end, marketing hero only |
| **Ink** | `#18181B` | Primary text |
| **Stone** | `#52525B` | Secondary text |
| **Mist** | `#F4F4F6` | Surface background |
| **Cloud** | `#FFFFFF` | Elevated surfaces |
| **Ember** | `#C45C4A` | Danger / destructive only |

**Internal nicknames:** Pixelanea Green (not Moss — Elena: "Moss sounds like a paint swatch at Lowe's").

**Maya:** Riley doesn't care. Morgan needs contrast. We're good.

---

## Part 24: Logo × color × type — lockups

**Jordan:** Final combinations approved for use:

### Lockup 1 — Product header (app)

```text
[glyph 24px]  Pixelanea     ← Outfit 16px/600, Ink, solid
```

No split color. Glyph uses Pixelanea Green active cell.

### Lockup 2 — Marketing header (website)

```text
[P·Mark 32px]  Pixelanea
              ↑ Pixel = Ink, anea = Pixelanea Green (≥80px wide)
```

### Lockup 3 — GitHub README banner

```text
┌────────────────────────────────────────────────────────────┐
│  gradient bg (#3F6F5A → #5AAF82) at 15% opacity on Mist    │
│                                                            │
│     [P·Mark]   Pixelanea                                   │
│                Pixel art editor on your computer           │
│                          ↑ Outfit 18px, Stone              │
│                                                            │
│     [ Download ]  [ GitHub ]                               │
└────────────────────────────────────────────────────────────┘
```

**Elena:** Hero headline above lockup — Sora 48px: **"Make pixel art. Keep it local."**

**Sam:** Is that the tagline?

**Elena:** A/B against "Pixel art editor on your computer." Shorter wins on Twitter.

**Maya:** "Keep it local" resonates with Morgan. "Make pixel art" resonates with Riley. Combined works.

**Jordan:** Subtitle stays descriptive for SEO. Tagline is emotional. Both appear on marketing — tagline prominent, subtitle below.

### Favicon & OS file association

| Size | Asset | Notes |
|------|-------|-------|
| 16×16 | Grid glyph | 4×4, no anti-alias on pixel edges |
| 32×32 | Grid glyph | optional 1px padding |
| 180×180 | P·Mark in Garden Frame | iOS / PWA |
| 512×512 | P·Mark in Garden Frame | install splash |
| `.pixelanea` file icon | Grid glyph + corner fold | Elena: "like a document, not an app" |

**Elena:** File icon is huge for word-of-mouth — "look for the green pixel file."

**Sam:** Windows .ico, macOS .icns, Linux freedesktop — engineering ticket.

---

## Part 25: Brand personality stress-test (Elena's checklist)

**Elena:** Before I sign off, each choice against our five traits:

| Trait | Logo | Type | Color |
|-------|------|------|-------|
| Approachable | Glyph reads as "pixels" not "enterprise" | 14px Outfit body | Warm-neutral Mist, not hospital white |
| Grounded | Flat marks, no 3D gloss | No display font in app | No neon, no purple gradient |
| Crafted | Integer pixel grid in glyph | Mono for precision data | Intentional green, not Material default |
| Quietly playful | One "active" green cell | — | Gradient **only** on marketing hero |
| Focus-first | Simple marks, no mascot | App has zero Sora | Chrome neutrals recede |

**Maya:** All pass. Morgan projector test scheduled with **final** Mist + `#3F6F5A` buttons.

**Elena:** I'm signed off.

---

## Part 26: The consensus round

**Sam:** Round-robin. One sentence each — are we locked?

**Elena:** Logo system is P·Mark + Grid glyph + split wordmark on marketing; tagline **"Make pixel art. Keep it local."**

**Jordan:** Colors unified on Pixelanea Green `#3F6F5A`; neutrals cooled one step; gradient marketing-only.

**Maya:** Typography: Outfit everywhere in product, Sora hero-only on web, JetBrains Mono for data; 14px body floor.

**Sam:** Ship the brand guide. No more logo iterations until v2 unless user testing breaks something.

**All:** **Locked.**

---

## Part 27: Brand guide deliverables (consensus output)

| Deliverable | Owner | Due |
|-------------|-------|-----|
| `brand/logo-*.svg` (4 assets) | Jordan | Aug 18 |
| `brand/colors.css` + Tailwind extension | Jordan | Aug 18 |
| `brand/typography.md` | Jordan | Aug 18 |
| Favicon + app icon set | Jordan | Aug 20 |
| `.pixelanea` file icon mockup | Jordan → Eng | Aug 25 |
| Marketing hero (Figma + export) | Elena + Jordan | Aug 22 |
| README banner SVG | Elena | Aug 22 |
| Tagline A/B landing page | Elena + Maya | Aug 28 |
| Projector contrast sign-off | Maya | Aug 21 |
| `BRAND.md` in repo (single source) | Sam | Aug 25 |

### `BRAND.md` table of contents (agreed)

1. Name, tagline, subtitle  
2. Logo system + clear space + misuse  
3. Color tokens (product vs marketing)  
4. Typography scale  
5. Voice & tone (link Session 1–2)  
6. Asset download paths  

---

## Part 28: Final brand specification summary

### Name & copy

| Item | Value |
|------|-------|
| Product name | **Pixelanea** |
| Tagline | **Make pixel art. Keep it local.** |
| Subtitle | *Pixel art editor on your computer* |
| File extension | `.pixelanea` |

### Logo

| Asset | Description |
|-------|-------------|
| Primary mark | **P·Mark** — 5-block monogram, active pixel top-left of counter |
| Favicon / glyph | **4×4 Grid Mark** — active pixel bottom-right |
| Wordmark | Outfit SemiBold, `-0.02em` tracking |
| Marketing wordmark | Split: Pixel = Ink, anea = Pixelanea Green (≥80px) |
| App icon | P·Mark in soft rounded square (Garden Frame), 180/512px |

### Color

| Token | Light | Dark |
|-------|-------|------|
| `accent` | `#3F6F5A` | `#82C4A6` |
| `accent-hover` | `#325A48` | `#9DD4B8` |
| `accent-muted` | `#D8EBE2` | `#1E3329` |
| `bg-surface` | `#F4F4F6` | `#1C1C21` |
| `text-primary` | `#18181B` | `#EDEDEF` |
| Marketing gradient | `135deg, #3F6F5A → #5AAF82` | Hero background only |

### Typography

| Context | Font |
|---------|------|
| App UI | Outfit 400/500/600 |
| App data | JetBrains Mono 400/500 |
| Marketing hero | Sora 600 |
| Marketing body | Outfit 400 |

---

## Part 29: Open items (post-lock)

**Elena:**
- Swag? (sticker sheet with glyph) — backlog for 1k GitHub stars  
- Pitch to pixel art YouTubers with README banner kit  

**Jordan:**
- Export `brand/` folder to repo  
- Sync Tailwind config to final tokens  

**Maya:**
- Projector test on Aug 21 — if fail, we tweak Stone contrast, **not** the logo  

**Sam:**
- `BRAND.md` is the authority; ARCHITECTURE.md links to it, doesn't duplicate  

---

*Session 3 complete. Brand locked. Implementation begins.*
