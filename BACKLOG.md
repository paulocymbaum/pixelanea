# Pixelanea Backlog

Product backlog, opportunity mapping, and delivery roadmap for Pixelanea.

**Related docs:** [UX.md](./UX.md) · [DESIGN.md](./DESIGN.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPENDENCIES.md](./DEPENDENCIES.md) · [BRAINSTORM.md](./BRAINSTORM.md)

---

## Product vision

> **Make pixel art. Keep it local.**

A free, open-source, local-only pixel art editor where anyone can pixelate images, draw on a grid, animate in 8/16/32 frames, and share a single `.pixelanea` project file — without accounts, subscriptions, or the internet.

**North-star outcome:** Users ship creative work (sprites, icons, classroom projects) faster than they would with paid or browser-based alternatives, and own their files completely.

---

## Opportunity Solution Tree

*Framework: [Teresa Torres](https://www.producttalk.org/opportunity-solution-tree/) — connect outcomes → opportunities → solutions → experiments.*

```text
                        ┌─────────────────────────────────────┐
                        │  OUTCOME                            │
                        │  Users create & share pixel art     │
                        │  locally without tool friction      │
                        └─────────────────┬───────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
          ▼                               ▼                               ▼
   ┌──────────────┐                ┌──────────────┐                ┌──────────────┐
   │ OPPORTUNITY  │                │ OPPORTUNITY  │                │ OPPORTUNITY  │
   │ Start fast   │                │ Fix mistakes │                │ Own the file │
   │ (time-to-    │                │ without panic│                │ (portable    │
   │  first pixel)│                │              │                │  .pixelanea) │
   └──────┬───────┘                └──────┬───────┘                └──────┬───────┘
          │                               │                               │
    ┌─────┴─────┐                   ┌─────┴─────┐                   ┌─────┴─────┐
    ▼           ▼                   ▼           ▼                   ▼           ▼
┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐
│SOLUTION│ │SOLUTION│           │SOLUTION│ │SOLUTION│           │SOLUTION│ │SOLUTION│
│Two     │ │Import  │           │Eraser  │ │Undo/   │           │.pixel- │ │Open/   │
│front   │ │wizard  │           │tool    │ │redo    │           │anea    │ │Save    │
│doors   │ │        │           │        │ │stack   │           │bundle  │ │flow    │
└───┬────┘ └───┬────┘           └───┬────┘ └───┬────┘           └───┬────┘ └───┬────┘
    │          │                    │          │                    │          │
    ▼          ▼                    ▼          ▼                    ▼          ▼
┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐
│EXPERI- │ │EXPERI- │           │EXPERI- │ │EXPERI- │           │EXPERI- │ │EXPERI- │
│MENT    │ │MENT    │           │MENT    │ │MENT    │           │MENT    │ │MENT    │
│<60s to │ │Casey   │           │Morgan  │ │Riley   │           │Share   │ │Morgan  │
│first   │ │5-min   │           │class-  │ │undo    │           │file &  │ │80%     │
│pixel   │ │import  │           │room    │           │keyboard│           │reopen  │ │save    │
└────────┘ └────────┘           └────────┘ └────────┘           └────────┘ └────────┘

          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
          ▼                               ▼                               ▼
   ┌──────────────┐                ┌──────────────┐                ┌──────────────┐
   │ OPPORTUNITY  │                │ OPPORTUNITY  │                │ OPPORTUNITY  │
   │ Animate      │                │ Match game   │                │ Work offline │
   │ without      │                │ constraints  │                │ (schools &   │
   │ film school  │                │ (palette)    │                │  privacy)    │
   └──────┬───────┘                └──────┬───────┘                └──────┬───────┘
          │                               │                               │
    ┌─────┴─────┐                   ┌─────┴─────┐                   ┌─────┴─────┐
    ▼           ▼                   ▼           ▼                   ▼           ▼
┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐           ┌────────┐ ┌────────┐
│8/16/32 │ │Play    │           │Palette │ │Palette │           │Local   │ │No      │
│frame   │ │preview │           │editor  │ │lock    │           │C++ API │ │login   │
│duplicate│ │player │           │        │ │        │           │+SQLite │ │wall    │
└────────┘ └────────┘           └────────┘ └────────┘           └────────┘ └────────┘
```

### Outcome → opportunity mapping

| Desired outcome | Opportunity (user need) | Persona | Evidence |
|-----------------|-------------------------|---------|----------|
| Create pixel art locally | Start drawing in under 60 seconds | Riley | Paid tools slow adoption; jam deadlines |
| Create pixel art locally | Turn a photo into pixels in 5 minutes | Casey | Photoshop pixelate looks mushy |
| Create pixel art locally | Run workshops without Wi-Fi or accounts | Morgan | Schools block cloud tools |
| Share and keep work | One file to email, USB, or Git | Riley, Morgan | Browser editors lose projects |
| Share and keep work | Reopen project on another machine | Casey, Riley | Export hell in general editors |
| Iterate creatively | Fix mistakes without fear | Morgan, Riley | Kids panic; devs erase constantly |
| Iterate creatively | Undo history + keyboard shortcuts | Riley | Expected in any editor |
| Animate simply | 8-frame walk cycle without timeline complexity | Riley | Frame management is fiddly |
| Animate simply | Play loop immediately after drawing | Riley | Dopamine drives iteration |
| Match constraints | Lock palette to N colors | Alex | ROM hacks need exact limits |
| Trust the tool | No data leaves the device | Morgan, Riley | Privacy + classroom policy |

### Solution → experiment pairs (continuous discovery)

| Solution | Experiment | Success signal |
|----------|------------|----------------|
| Two front doors (blank + import) | 5-user prototype test | 80% reach canvas without help |
| Import wizard | Casey timed task | ≤5 min to usable 32×32 |
| Eraser as "Fix mistakes" | Morgan classroom pilot | <3 "how do I fix" questions per session |
| Undo stack | Riley observation | Uses Ctrl+Z within first 10 min |
| `.pixelanea` bundle | Share file between two laptops | Opens identically; 0 corruption |
| Frame duplicate 8/16/32 | Riley timed walk cycle | ≤45 min first 8-frame loop |
| Animation player | Click-through test | Play found without docs |
| Palette lock | Alex task | 0 off-palette pixels on export |
| Local-only server | Install on air-gapped machine | Full flow works offline |

---

## Startup Canvas

*Lean Canvas adapted for an open-source, local-first creative tool.*

| Block | Content |
|-------|---------|
| **Problem** | 1. Paid pixel tools block hobbyists and students<br>2. Browser editors require accounts and lose work<br>3. Animation frame setup is confusing in general editors<br>4. Image pixelation in mainstream tools looks unintentional<br>5. Schools can't use cloud-dependent creative software |
| **Customer segments** | **Primary:** Riley — hobby game devs (Godot, Unity, PICO-8)<br>**Secondary:** Casey — designers dabbling in retro art<br>**Secondary:** Morgan — teachers / workshop leaders<br>**Tertiary:** Alex — modders with strict palette limits<br>**Early adopters:** itch.io jammers, coding clubs, open-source contributors |
| **Unique value proposition** | **Free pixel art editor that runs on your computer.** Draw, pixelate photos, animate in 8/16/32 frames, and share one `.pixelanea` file — no account, no cloud, no subscription. |
| **Solution** | React canvas editor + C++ local API + SQLite per project + portable ZIP bundle (`.pixelanea`) |
| **Channels** | GitHub (source + releases), itch.io, Godot/Unity community forums, Reddit (r/gamedev, r/PixelArt), teacher CS education lists, word of mouth via shareable project files |
| **Revenue streams** | None in v1 — MIT/Apache open source<br>*Future optional:* donations (GitHub Sponsors, Ko-fi), paid desktop installer convenience (not feature-gated) |
| **Cost structure** | Volunteer / maintainer time; free CI (GitHub Actions); no cloud infra; domain + code signing (future) |
| **Key metrics** | Downloads / GitHub stars<br>Time to first pixel (&lt;60s)<br>Time to first import (&lt;5 min)<br>Animation trial rate (&gt;30% of savers)<br>Save success without docs (&gt;95%)<br>Workshop save rate (&gt;80%)<br>Contributor PRs / issue resolution time |
| **Unfair advantage** | Portable single-file project format; local-first by architecture (not policy); open source trust; focused scope (not competing with Aseprite on features); dual entry (draw + pixelate) |

### Risk assumptions to validate

| Assumption | Risk if wrong | Validation |
|------------|---------------|------------|
| Users want local-only over cloud sync | Low adoption vs Figma-like tools | Morgan pilot + Riley interviews |
| C++ backend worth complexity vs Node | Slower shipping | MVP benchmark: pixelate 4K image &lt;2s |
| `.pixelanea` bundle is intuitive | Users prefer folder of PNGs | Share test: 5 pairs exchange files |
| 8/16/32 frames enough | Users need arbitrary frame counts | Post-launch analytics + Discord feedback |
| Casey path drives growth | Only game devs adopt | Landing page A/B: import vs blank CTA |

---

## MVP definition

**MVP goal:** Riley can draw an 8-frame walk cycle and save a `.pixelanea` file; Casey can import a photo and get a pixel grid in under 5 minutes; Morgan can run a workshop offline with labeled tools and obvious eraser/undo.

**MVP is NOT:** layers, tilemaps, GIF export, cloud sync, plugin marketplace, desktop installer, onion skin, arbitrary frame counts, PNG sequence import.

### MVP scope boundaries

| In MVP | Out of MVP (post-v1) |
|--------|----------------------|
| Blank canvas (16/32/64 presets) | Custom arbitrary canvas size UI |
| Image import + pixelate | Batch image processing |
| Paint, eraser, eyedropper, fill, line | Shapes |
| Palette editor + presets | Palette import from LOSPEC URL |
| Palette lock | Layer system |
| Undo / redo (client-side) | Server-side command history |
| Duplicate to 8/16/32 frames | Frame reorder drag-and-drop |
| Animation preview (play/pause/FPS/loop) | Onion skin |
| Save / open `.pixelanea` bundle | GIF / spritesheet export |
| PNG export (current frame) | PNG sequence import |
| Light + dark theme | System tray / desktop shell |
| Local C++ API on localhost | Web-only mode (WASM) |
| OpenAPI contract + TS client | Mobile app |

### MVP success criteria (ship gate)

- [ ] Time to first pixel painted **&lt; 60 seconds** (Riley)
- [ ] Time to first pixelated import **&lt; 5 minutes** (Casey)
- [ ] 8-frame loop creatable and saved **&lt; 45 minutes** first visit (Riley)
- [ ] Workshop save rate **&gt; 80%** in pilot (Morgan)
- [ ] `.pixelanea` round-trip: save → copy → open on second machine **without data loss**
- [ ] App runs **fully offline** after install
- [ ] WCAG AA contrast on primary flows (Morgan projector test pass)
- [ ] Zero P0 bugs in save/open/paint/animate paths

---

## Current fixes

Near-term UX and export improvements — tracked here and mirrored in roadmap / domain sections below.

- [x] **FIX-001** Eyedropper → paint: after absorbing a color from the canvas (eyedropper), switch active tool to paint automatically
- [x] **FIX-002** Save as asset type — Character, Prop, Background, or Animation (*Animation* option ships after create-and-run animation workflow is complete)
- [x] **FIX-003** Color filters as opaque overlays; placeable lighting points that subtly shift local color and shading on the image
- [x] **FIX-004** Remove background when saving pixelated image output — toggle in import/save flow, **default on**

---

## Roadmap

```text
2026 Q3          2026 Q4              2027 Q1              2027 Q2+
────────         ────────             ────────             ────────
Phase 0          Phase 1              Phase 2              Phase 3+
Foundation       MVP                  v1.0 Launch          Growth
────────         ────────             ────────             ────────
Monorepo         Core editor          Polish + docs        Desktop app
OpenAPI          Pixelate             GIF/spritesheet      Plugins SDK
SQLite schema    Animation            Marketing site       Tilemap mode
Dev tooling      .pixelanea I/O       Community            Collaboration?
```

### Phase 0 — Foundation *(weeks 1–4)*

Goal: Monorepo scaffold, API contract, database, empty editor shell running locally.

- [x] **P0-001** Initialize monorepo (`pnpm-workspace`, root scripts)
- [x] **P0-002** Create `contracts/openapi.yaml` — projects, frames, palette, health
- [x] **P0-003** Scaffold `apps/web` (Vite + React + TypeScript + Tailwind)
- [x] **P0-004** Scaffold `server/` (CMake + vcpkg + cpp-httplib)
- [x] **P0-005** SQLite schema v1 + migration `001_initial.sql`
- [x] **P0-006** Project repository (open, save, close)
- [x] **P0-007** Frame repository (get, put)
- [x] **P0-008** `scripts/dev.sh` — start API + Vite with proxy
- [x] **P0-009** Generate `packages/api-client` from OpenAPI
- [x] **P0-010** API health endpoint + frontend connection check
- [x] **P0-011** Design tokens in Tailwind (`DESIGN.md` colors/type)
- [x] **P0-012** Editor shell layout (header, panels, canvas area)
- [x] **P0-013** CI: lint frontend + build backend (GitHub Actions)

### Phase 1 — MVP *(weeks 5–12)*

Goal: Shippable core — draw, pixelate, palette, undo, animate, save.

#### Epic 1.1 — Canvas & drawing

- [x] **MVP-101** HTML Canvas renderer (checkerboard, grid, pixels)
- [x] **MVP-102** HiDPI / `devicePixelRatio` scaling
- [x] **MVP-103** Pointer input → grid cell coordinates
- [x] **MVP-104** Zoom (25%–3200%) + fit-to-view
- [x] **MVP-105** Grid lines at ≥8× zoom
- [x] **MVP-106** Paint tool (click + drag)
- [x] **MVP-107** Eraser tool ("Fix mistakes" label)
- [x] **MVP-108** Eyedropper tool
- [x] **MVP-109** Tool plugin interface + toolbar (icon + label)
- [x] **MVP-110** Active tool state (accent border + bold label)

#### Epic 1.2 — Palette

- [x] **MVP-201** Palette panel UI (swatch grid)
- [x] **MVP-202** Active color selection
- [x] **MVP-203** Keyboard shortcuts colors 1–9
- [x] **MVP-204** Add / remove / edit colors
- [x] **MVP-205** Curated presets (Retro, Gameboy, Monochrome)
- [x] **MVP-206** Palette lock toggle
- [x] **MVP-207** Persist palette to SQLite via API
- [x] **MVP-208** Collapsible palette panel (remember state)
- [x] **MVP-209** Procedural shading palettes (cell-shading, lighting, dark) from active color

#### Epic 1.3 — Undo / redo

- [x] **MVP-301** Command pattern (`PaintCell`, `ClearCell`)
- [x] **MVP-302** Client-side undo stack (cap 500)
- [x] **MVP-303** Ctrl+Z / Ctrl+Shift+Z
- [x] **MVP-304** Toolbar undo/redo buttons
- [x] **MVP-305** Debounced frame sync to backend (serial coordinator + palette lane)

#### Epic 1.4 — New project & import

- [x] **MVP-401** New project screen — two equal cards (Blank / From image)
- [x] **MVP-402** Resolution presets (16×16, 32×32, 64×64)
- [x] **MVP-403** Animation toggle on new project (8/16/32)
- [x] **MVP-404** C++ image decode (stb_image)
- [x] **MVP-405** Pixelate pipeline (downscale + quantize)
- [x] **MVP-406** `POST /import/pixelate` endpoint
- [x] **MVP-407** Import wizard UI (drop file → preset → preview → accept)
- [x] **MVP-408** Skippable onboarding overlay (3 steps)

#### Epic 1.5 — Animation

- [x] **MVP-501** Frame entity in DB + API
- [x] **MVP-502** Duplicate current frame to 8/16/32 endpoint
- [x] **MVP-503** Frame strip UI (thumbnails + active highlight)
- [x] **MVP-504** Frame switch (click thumbnail)
- [x] **MVP-505** Animation player (play/pause)
- [x] **MVP-506** FPS slider (1–24, default 8)
- [x] **MVP-507** Loop toggle
- [x] **MVP-508** Read-only canvas during playback
- [x] **MVP-509** Frame strip highlight during play

#### Epic 1.6 — Project I/O

- [x] **MVP-601** `.pixelanea` ZIP bundle format (manifest + project.db)
- [x] **MVP-602** Manifest schema + checksums (SHA-256)
- [x] **MVP-603** Pack project on save
- [x] **MVP-604** Unpack + validate on open
- [x] **MVP-605** Save / Save As UI
- [x] **MVP-606** Open project file picker (`.pixelanea` filter)
- [x] **MVP-607** Plain-language error messages
- [x] **MVP-608** PNG export (current frame)
- [x] **MVP-609** Schema migration on open (v1)

#### Epic 1.7 — Theme & accessibility

- [x] **MVP-701** Light theme (design tokens)
- [x] **MVP-702** Dark theme (design tokens)
- [x] **MVP-703** Follow OS preference + persist choice
- [x] **MVP-704** Theme toggle in header
- [x] **MVP-705** Keyboard navigation all tools
- [x] **MVP-706** Focus rings (2px accent)
- [x] **MVP-707** `?` shortcuts overlay
- [x] **MVP-708** `prefers-reduced-motion` support
- [x] **MVP-709** Optional "Show technical info" (coords, hex, index)

#### Epic 1.8 — Brand assets (MVP minimum)

- [x] **MVP-801** Logo glyph + lockup SVGs (`brand/`)
- [x] **MVP-802** Favicon set (16, 32)
- [x] **MVP-803** App header lockup
- [x] **MVP-804** Self-hosted fonts (Outfit, JetBrains Mono)

### Phase 2 — v1.0 Launch *(weeks 13–18)*

Goal: Polish, docs, marketing, community-ready release.

#### Epic 2.1 — Export & power features

- [x] **V1-101** PNG spritesheet export (all frames)
- [x] **V1-102** GIF export
- [x] **V1-103** Export warning if off-palette pixels exist
- [x] **V1-104** Custom canvas size dialog
- [x] **V1-105** Fill bucket tool
- [x] **V1-106** Line tool (Bresenham)
- [x] **FIX-002** Save as asset type (Character, Prop, Background, Animation)
- [x] **FIX-004** Remove background on pixelated image save (default on)

#### Epic 2.2 — Animation polish

- [x] **V1-201** Onion skin overlay (frame n−1 at 30%)
- [x] **V1-202** Frame duplicate blank (not copy) option
- [x] **V1-203** Copy frame to frame
- [x] **V1-204** Frame reorder (drag-and-drop)

#### Epic 2.3 — Docs & onboarding

- [x] **V1-301** README (install, features, screenshots)
- [x] **V1-302** CONTRIBUTING.md
- [x] **V1-303** User guide (docs/ or website)
- [ ] **V1-304** Workshop teacher kit (template `.pixelanea` + PDF)
- [x] **V1-305** Keyboard shortcuts reference card
- [x] **V1-306** First-run welcome (tagline + two front doors)

#### Epic 2.4 — Marketing & brand

- [ ] **V1-401** Marketing landing page (4 pages)
- [ ] **V1-402** README banner SVG
- [ ] **V1-403** GitHub release assets (Linux, macOS, Windows)
- [ ] **V1-404** itch.io page
- [ ] **V1-405** App icons 180/512 (Garden Frame)
- [ ] **V1-406** `.pixelanea` OS file association icons
- [ ] **V1-407** Tagline A/B test ("Keep it local" vs subtitle)

#### Epic 2.5 — Quality & research

- [ ] **V1-501** 6× persona interviews (Maya)
- [ ] **V1-502** Morgan classroom pilot
- [ ] **V1-503** Projector contrast sign-off
- [ ] **V1-504** E2E tests (Playwright): new → paint → save → reopen
- [ ] **V1-505** Backend unit tests (Catch2): pixelate, bundle, migrations
- [ ] **V1-506** Performance benchmark: 4K import &lt;2s
- [ ] **V1-507** Security audit: bundle path traversal, localhost-only bind
- [ ] **V1-508** THIRD_PARTY_NOTICES.md

#### Epic 2.6 — v1.0 release

- [ ] **V1-601** Release candidate build
- [ ] **V1-602** Beta feedback window (2 weeks)
- [ ] **V1-603** P0/P1 bug burn-down
- [ ] **V1-604** v1.0.0 GitHub release + changelog
- [ ] **V1-605** Announce: Reddit, itch.io, Godot forums

#### Epic 2.7 — UX polish (current fixes)

- [x] **FIX-001** Auto-switch to paint after eyedropper (absorb color)
- [x] **FIX-003** Opaque color overlay filters + lighting points for local color shifts

### Phase 3 — Growth *(2027 Q1+)*

Goal: Expand reach, desktop experience, advanced workflows.

#### Epic 3.1 — Desktop app

- [ ] **GROW-101** Evaluate Tauri vs Electron
- [ ] **GROW-102** Desktop shell launches C++ server + embedded web
- [ ] **GROW-103** Single-binary installer (Windows/macOS/Linux)
- [ ] **GROW-104** Code signing
- [ ] **GROW-105** Auto-update mechanism (optional, privacy-respecting)

#### Epic 3.2 — Import / export expansion

- [ ] **GROW-201** PNG sequence import (Animation Sketcher persona)
- [ ] **GROW-202** Aseprite file import (research feasibility)
- [ ] **GROW-203** Palette import from LOSPEC
- [ ] **GROW-204** CLI: `pixelanea export project.pixelanea --format png`

#### Epic 3.3 — Editor depth

- [ ] **GROW-301** Layer system (schema migration v2)
- [ ] **GROW-302** Tilemap mode
- [ ] **GROW-303** Tile stamp tool
- [ ] **GROW-304** Arbitrary frame count
- [ ] **GROW-305** Plugin SDK (`packages/plugin-sdk`)

#### Epic 3.4 — Community & i18n

- [ ] **GROW-401** Spanish (ES) localization
- [ ] **GROW-402** Portuguese (PT) localization
- [ ] **GROW-403** Community Discord / GitHub Discussions
- [ ] **GROW-404** Showcase gallery (user-submitted, static site)
- [ ] **GROW-405** GitHub Sponsors / donation page

### Phase 4 — Product vision *(2027 Q2+)*

Longer-horizon bets — validate demand before building.

| Initiative | Hypothesis | Gate to start |
|------------|------------|---------------|
| WASM offline mode | Users want browser-only without server | Desktop downloads plateau |
| Collaboration | Teachers want shared critique, not co-editing | Community requests &gt;50 |
| Tilemap + autotile | Game devs need level design in same tool | Riley interviews rank ≥4/5 |
| Video export | Streamers want MP4 preview | GIF export usage &gt;20% |
| Education licensing pack | Districts want bulk deploy | 3+ inbound teacher inquiries |
| Mobile viewer (read-only) | Share `.pixelanea` preview on phone | File sharing metric high |

- [ ] **VIS-001** Quarterly vision review against metrics
- [ ] **VIS-002** Animation Sketcher retention analysis
- [ ] **VIS-003** Competitive scan (Aseprite, LibreSprite, Pixelorama)
- [ ] **VIS-004** Roadmap reprioritization per Opportunity Tree outcomes

---

## Backlog by domain (all tasks)

*Checkbox master list — same items as roadmap, grouped for sprint planning.*

### Documentation & planning

- [x] **DOC-001** README.md
- [x] **DOC-002** ARCHITECTURE.md *(done)*
- [x] **DOC-003** DEPENDENCIES.md *(done)*
- [x] **DOC-004** UX.md *(done)*
- [x] **DOC-005** DESIGN.md *(done)*
- [x] **DOC-006** BRAINSTORM.md *(done)*
- [x] **DOC-007** BACKLOG.md *(this file)*
- [ ] **DOC-008** BRAND.md (from Session 3 deliverables)
- [ ] **DOC-009** CHANGELOG.md
- [ ] **DOC-010** LICENSE (MIT)

### Infrastructure & monorepo

- [x] **INF-001** `pnpm-workspace.yaml`
- [x] **INF-002** Root `package.json` scripts
- [x] **INF-003** `server/CMakeLists.txt`
- [x] **INF-004** `server/vcpkg.json`
- [x] **INF-005** `scripts/dev.sh`
- [x] **INF-006** GitHub Actions CI (frontend)
- [x] **INF-007** GitHub Actions CI (backend)
- [ ] **INF-008** Pre-commit hooks (lint, format)
- [x] **INF-009** `contracts/openapi.yaml`
- [x] **INF-010** OpenAPI → TypeScript codegen script

### Backend (C++ / SQLite)

- [x] **BE-001** HTTP server localhost-only bind (`127.0.0.1`)
- [x] **BE-002** JSON request/response (nlohmann-json)
- [x] **BE-003** SQLite connection manager
- [x] **BE-004** Migration runner
- [x] **BE-005** `ProjectRepository`
- [x] **BE-006** `FrameRepository`
- [x] **BE-007** `PaletteRepository`
- [x] **BE-008** Pixel blob encode/decode (RLE or LZ4)
- [x] **BE-009** `POST /api/projects` — create
- [x] **BE-010** `POST /api/projects/open` — open bundle
- [x] **BE-011** `GET /api/projects/{id}` — metadata
- [x] **BE-012** `PATCH /api/projects/{id}` — update settings
- [x] **BE-013** `POST /api/projects/{id}/save` — write bundle
- [x] **BE-014** `DELETE /api/projects/{id}` — close
- [x] **BE-015** `GET/PUT /api/projects/{id}/frames/{index}`
- [x] **BE-016** `POST /api/projects/{id}/frames/duplicate`
- [x] **BE-017** `GET/PUT /api/projects/{id}/palette`
- [x] **BE-018** `POST /api/projects/{id}/import/pixelate`
- [x] **BE-019** Bundle pack (libzip + manifest)
- [x] **BE-020** Bundle unpack + checksum validation
- [x] **BE-021** Path traversal protection on unpack
- [x] **BE-022** Image decode (stb_image)
- [x] **BE-023** Image downscale + palette quantization
- [x] **BE-024** `GET /api/health`
- [x] **BE-025** Error response schema (plain-language messages)
- [x] **BE-026** WAL checkpoint on save
- [x] **BE-027** Unit tests: repositories
- [x] **BE-028** Unit tests: pixelate pipeline
- [x] **BE-029** Unit tests: bundle I/O
- [x] **FIX-002** Project metadata: asset type field (Character, Prop, Background, Animation) in manifest / DB
- [x] **FIX-004** Pixelate pipeline: background removal on save (default enabled; transparent or keyed output)

### Frontend (React / Canvas)

- [x] **FE-001** Vite + React + TypeScript scaffold
- [x] **FE-002** Tailwind + design tokens
- [x] **FE-003** Radix primitives setup
- [x] **FE-004** Zustand editor store
- [x] **FE-005** API client integration
- [x] **FE-006** Editor shell layout
- [x] **FE-007** Header (logo, menus, project name, theme)
- [x] **FE-008** Tool sidebar
- [x] **FE-009** Palette panel
- [x] **FE-010** Frame strip
- [x] **FE-011** Status bar
- [x] **FE-012** Canvas component
- [x] **FE-013** Canvas renderer (pixels, checker, grid)
- [x] **FE-014** Pointer → cell mapping
- [x] **FE-015** Zoom controls
- [x] **FE-016** Paint tool
- [x] **FE-017** Eraser tool
- [x] **FE-018** Eyedropper tool
- [x] **FE-019** Tool switching + active state
- [x] **FE-020** Command dispatch + undo stack
- [x] **FE-021** Keyboard shortcuts handler
- [x] **FE-022** New project screen
- [x] **FE-023** Import wizard
- [x] **FE-024** Save / Open / Save As dialogs
- [x] **FE-025** Animation player component
- [x] **FE-026** FPS + loop controls
- [x] **FE-027** Theme provider (light/dark)
- [x] **FE-028** Shortcuts overlay (`?`)
- [x] **FE-029** Onboarding overlay (skippable)
- [x] **FE-030** PNG export (current frame)
- [x] **FE-035** PNG spritesheet export (all frames)
- [x] **FE-036** GIF export (animated, server-side)
- [x] **FE-031** Error toast / dialog components
- [x] **FE-032** Loading states (open project, import)
- [x] **FE-033** `@fontsource` Outfit + JetBrains Mono
- [x] **FE-037** Custom canvas size dialog (blank project)
- [x] **FE-038** Fill bucket tool
- [x] **FE-039** Line tool (Bresenham)
- [x] **FE-040** Sync coordinator — serialized frame/palette PUT with debounce + coalescing
- [x] **FIX-001** Eyedropper → auto-switch to paint after absorb color
- [x] **FIX-002** Save As asset type picker (Character, Prop, Background, Animation)
- [x] **FIX-003** Opaque overlay filters + lighting-point color adjustment UI
- [x] **FIX-004** Remove-background toggle on pixelated save (default on)

### Design & brand

- [x] **BR-001** `brand/logo-lockup.svg`
- [ ] **BR-002** `brand/logo-mark.svg`
- [x] **BR-003** `brand/logo-glyph.svg`
- [ ] **BR-004** `brand/logo-wordmark.svg`
- [x] **BR-005** `brand/colors.css`
- [x] **BR-006** Favicon 16/32
- [ ] **BR-007** App icons 180/512
- [ ] **BR-008** `.pixelanea` file icon
- [ ] **BR-009** README banner
- [ ] **BR-010** Marketing landing page design

### QA & release

- [ ] **QA-001** Manual test matrix: paint paths — *Sprint 1: S1-903 (formalize); harness 60/61 green per [qa_run_report](.cursor/changelog/mvp/20260731T234157_qa-e2e-gherkin/qa_run_report.md)*
- [ ] **QA-002** Manual test matrix: import paths — *Sprint 1: S1-903*
- [ ] **QA-003** Manual test matrix: animation paths — *Sprint 1: S1-903*
- [ ] **QA-004** Manual test matrix: save/open round-trip — *Sprint 1: S1-903, S1-205, S1-303*
- [ ] **QA-005** Playwright E2E: happy path — *Sprint 1: S1-907*
- [ ] **QA-006** Playwright E2E: error paths — *post-Sprint 1*
- [ ] **QA-007** Offline smoke test (air-gapped) — *harness green; browser E2E deferred*
- [ ] **QA-008** Cross-platform build test (Linux, macOS, Windows)
- [ ] **QA-009** Accessibility audit (axe)
- [ ] **QA-010** RC release checklist
- [ ] **QA-011** v1.0.0 release
- [ ] **QA-S1-106** Fix `paintMatrix.test.ts` CI compile failure — *Sprint 1 Week 1*
- [ ] **QA-S1-205** Unsaved navigation guard on New/Open — *Sprint 1 Week 1; blocks `@routing`*

---

## Sprint 1 — MVP Trust & Flow Hardening *(active)*

**Full sprint backlog:** [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md)

**Sources:** [UX/UI critique](.cursor/changelog/mvp/20260731T234500_uxui-design-critique/uxui_design_critique.md) · [QA E2E run report](.cursor/changelog/mvp/20260731T234157_qa-e2e-gherkin/qa_run_report.md) (rollup: **red** — 4 🔴, 12 🟡, 48 🟢, 51 ⚪)

**Sprint goal:** Make the implemented MVP shippable — cut broken flows, surface save/sync trust, native file pickers, animation guidance, and close QA reds.

### QA → sprint ticket map

| Issue | Priority | Ticket |
|-------|----------|--------|
| Navigation guards missing (`@routing` fail) | P0 | **S1-205** |
| `paintMatrix.test.ts` breaks full web test run | P0 | **S1-106** |
| Manual path Save/Open (workshop friction) | P0 | S1-301 → S1-303 |
| No visible save/dirty/sync state | P0 | S1-201, S1-202 |
| Broken Import tool in rail | P0 | S1-101 |
| Duplicate animation entry (create vs duplicate dialog) | P0 | S1-103, S1-401 |
| No Playwright E2E (51 scenarios skipped) | P1 | S1-907, S1-908 |
| QA-002/003/004 matrices not formalized | P1 | S1-903 |
| Export silent / download unverified | P1 | S1-601, S1-903 |
| Post-MVP export/onion in primary chrome | P1 | S1-104 |

### Sprint 1 exit criteria (summary)

- [ ] G1–G7 — see [BACKLOG_SPRINT_1.md#ship-gate-sprint-exit-criteria](./BACKLOG_SPRINT_1.md#ship-gate-sprint-exit-criteria)
- [ ] G8 — `pnpm --filter web test` exits 0 (**S1-106**)
- [ ] G9 — Unsaved guard on New/Open (**S1-205**, **S1-908**)
- [ ] G10 — QA feature rollup not red (re-run gherkin pass)

### Sprint 1 tickets (open)

| ID | Title | P | Week |
|----|-------|---|------|
| S1-106 | Fix paintMatrix.test.ts CI | P0 | 1 |
| S1-205 | Unsaved navigation guard | P0 | 1 |
| S1-101 | Remove broken Import tool | P0 | 1 |
| S1-103 | Single animation path + quick-start chip | P0 | 1 |
| S1-201 | Project status model | P0 | 1 |
| S1-202 | StatusBar rewrite | P0 | 1 |
| S1-301 | File-picker abstraction | P0 | 2 |
| S1-302 | Server native dialog (zenity) | P0 | 2 |
| S1-303 | Wire picker to file actions | P0 | 2 |
| S1-401 | Frame strip empty CTA | P0 | 2 |
| S1-908 | Playwright `@routing` E2E | P0 | 4 |
| S1-102 | Dedupe health check | P1 | 1 |
| S1-104 | Feature-flag advanced exports/onion | P1 | 1 |
| S1-402 | Onboarding reposition + animate step | P1 | 2 |
| S1-501 | Palette more-tools accordion | P1 | 3 |
| S1-502 | Palette auto-persist | P1 | 3 |
| S1-503 | Save As asset type collapse | P1 | 3 |
| S1-601 | Export toasts | P1 | 3 |
| S1-804 | ToolId cleanup | P1 | 4 |
| S1-903 | Formalize QA-002/003/004 matrices | P1 | 4 |
| S1-907 | Playwright `@smoke` E2E | P1 | 4 |
| S1-901 | Sprint test matrix | P0 | 4 |
| S1-105 | Remove Edit menu undo/redo dup | P2 | — |
| S1-203 | Connection banner | P2 | — |
| S1-403 | Verify import skips onboarding | P2 | — |
| S1-604 | File → Import image | P2 | — |
| S1-701–703 | Header save, visual parity, theme label | P2 | — |
| S1-801–803 | Lazy-mount, preset dedupe, prefetch | P2 | — |
| S1-902 | BACKLOG cross-links | P2 | 4 |

---

## Sprint mapping (historical phases)

| Sprint | Weeks | Focus | Key deliverables |
|--------|-------|-------|------------------|
| S1 | 1–2 | Phase 0 | Monorepo, OpenAPI, SQLite schema, dev.sh |
| S2 | 3–4 | Phase 0 | API CRUD, editor shell, design tokens, CI + unit tests |
| S3 | 5–6 | MVP | Canvas render, paint, eraser, palette basic |
| S4 | 7–8 | MVP | Undo, eyedropper, new project + import wizard |
| S5 | 9–10 | MVP | Animation frames, player, duplicate |
| S6 | 11–12 | MVP | `.pixelanea` I/O, themes, MVP ship gate |
| S7 | 13–14 | v1.0 | Export GIF/spritesheet, fill/line tools ✓ |
| S8 | 15–16 | v1.0 | Docs, marketing site, brand assets |
| S9 | 17–18 | v1.0 | QA, beta, v1.0.0 release |

---

## Priority legend

| Label | Meaning |
|-------|---------|
| **P0** | Blocker — MVP cannot ship |
| **P1** | Required for v1.0 launch |
| **P2** | Growth phase |
| **P3** | Vision / exploratory |

---

## How to use this backlog

1. **Opportunity Tree** — validate *why* before building; link experiments to outcomes.
2. **Startup Canvas** — align team on problem, segments, and metrics.
3. **MVP section** — scope guard; reject PRs that expand MVP without explicit trade-off.
4. **Roadmap phases** — sequence delivery; don't start Phase 3 until MVP ship gate passes.
5. **Checkboxes** — mark `[x]` when done; keep IDs stable for issue tracker linking (`MVP-106`, etc.).

*Last updated: July 2026 — Phase 0 complete. Phase 1 MVP complete. Phase 2 Epic 2.1–2.2 complete. Epic 2.3: README (V1-301), CONTRIBUTING (V1-302), user guide (V1-303), shortcuts card (V1-305), first-run welcome tagline (V1-306) complete. V1-304 workshop PDF + template file pending. Current fixes: FIX-003 complete (overlay filters/lighting). **Sprint 1 active** — see [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md); QA run 2026-07-31 rollup red (navigation guards + CI harness).*
