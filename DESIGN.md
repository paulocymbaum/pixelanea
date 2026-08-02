# Pixelanea Design System

Authoritative visual and interaction design reference for Pixelanea. Distilled from persona workshops and brand sessions documented in [BRAINSTORM.md](./BRAINSTORM.md).

For user research, personas, and UX flows see [UX.md](./UX.md). For technical stack see [DEPENDENCIES.md](./DEPENDENCIES.md).

---

## Design philosophy

**The canvas is pixel art. The app is modern.**

Pixelanea chrome is calm, readable, and recedes so user artwork stays the hero. Brand colors never appear inside the canvas viewport. Retro aesthetics belong on the grid — not on buttons, labels, or dialogs.

| Principle | Meaning |
|-----------|---------|
| **Crafted, not cosplay** | Crisp borders, integer spacing, sharp swatch corners — digital honesty without 8-bit UI fonts |
| **Focus-first** | Canvas-centered layout; max 6–8 tools in v1; collapsible panels |
| **Quietly playful** | One active green pixel in the logo; motion only where it helps |
| **Accessible by default** | 14px body minimum, WCAG AA contrast, keyboard-first paths |
| **Offline-safe** | Self-hosted fonts and icons; no CDN dependencies |

---

## Brand identity

### Name & copy

| Item | Value |
|------|-------|
| Product name | **Pixelanea** |
| Tagline | **Make pixel art. Keep it local.** |
| Subtitle | *Pixel art editor on your computer* |
| Project file | `.pixelanea` |

- **App shell:** display name only — "Pixelanea"
- **Marketing / installer / first-run:** name + subtitle
- **Emotional hook:** tagline (hero headlines, README banner)
- **SEO / clarity:** subtitle (meta descriptions, store listings)

### Brand personality

| Trait | Expression | Avoid |
|-------|------------|-------|
| **Approachable** | Plain words, forgiving flows | Childish UI, dumbed-down tooltips |
| **Grounded** | Local files, no hype | Gloomy tone, paranoid privacy copy |
| **Crafted** | Intentional pixels, crisp UI | Sloppy retro cosplay, pixel fonts in chrome |
| **Quietly playful** | Small delights (active pixel mark) | Mascots, emoji celebrations |
| **Respectful of focus** | Canvas-first, minimal chrome | Social feeds, gamification, modal guilt |

### Voice & tone

| Context | On-brand | Off-brand |
|---------|----------|-----------|
| Save success | "Project saved." | "Awesome sauce! 🎉" |
| Error | "Couldn't open this file. Is it a .pixelanea project?" | "Error 0x4F2C" |
| Empty canvas | "Start drawing — pick a color on the left." | "Your canvas awaits, creator!" |
| Offline | "Works without internet. Files stay on your device." | "No cloud required!!!" |

---

## Logo system

One logo family, two optical sizes. The **active pixel** — the cell you're working on — is the shared semantic across all marks.

### Assets

| File | Mark | Use |
|------|------|-----|
| `logo-lockup.svg` | P·Mark + "Pixelanea" wordmark | Website header, README, press kit |
| `logo-mark.svg` | P·Mark only | App About screen, social avatar |
| `logo-glyph.svg` | 4×4 Grid Mark | Favicon 16px, taskbar, file association |
| `logo-wordmark.svg` | Text only | Footer, narrow banners |

### P·Mark (primary)

Stylized **P** built from five square blocks. Accent cell sits at the top-left of the P counter (negative space). Use at **32px and above**.

### Grid Mark (glyph)

4×4 pixel grid. Seven neutral cells; one **Pixelanea Green** accent cell at **bottom-right**. Use at **16px favicon** and `.pixelanea` file icon. No anti-aliasing on pixel edges.

### Garden Frame (app icon)

P·Mark inside a soft rounded square with 2px inset border. Use at **180×180** (iOS/PWA) and **512×512** (install splash).

### Wordmark

| Rule | Value |
|------|-------|
| Typeface | Outfit SemiBold (600) |
| Case | Pixelanea — capital P only |
| Letter-spacing | `-0.02em` |
| App chrome | Solid Ink (`#18181B` / `#EDEDEF` dark) — no split color |
| Marketing (≥80px wide) | **Pixel** = Ink, **anea** = Pixelanea Green |
| Marketing fallback | Solid Ink if width < 80px or on busy backgrounds without scrim |

### Clear space & misuse

| Rule | Value |
|------|-------|
| Clear space | 1× cap height on all sides |
| Minimum lockup width | 120px digital |
| Minimum glyph size | 16px |
| Don't | Stretch, rotate, add glow, place on photos without scrim |
| Do | Glyph on solid `bg-surface` or dark hero `#18181B` |

### Lockups

**Product header (app):**
```text
[glyph 24px]  Pixelanea     ← Outfit 16px/600, solid Ink
```

**Marketing header (website):**
```text
[P·Mark 32px]  Pixelanea    ← split wordmark when ≥80px wide
```

---

## Color system

### Named palette

| Name | Hex | Role |
|------|-----|------|
| **Pixelanea Green** | `#3F6F5A` | Primary accent (light mode) |
| **Pixelanea Mint** | `#82C4A6` | Primary accent (dark mode) |
| **Sprout** | `#5AAF82` | Marketing gradient end only |
| **Ink** | `#18181B` | Primary text (light) |
| **Stone** | `#52525B` | Secondary text (light) |
| **Mist** | `#F4F4F6` | Surface background (light) |
| **Cloud** | `#FFFFFF` | Elevated surfaces |
| **Ember** | `#C45C4A` | Danger / destructive only |

### Design tokens

#### Light theme

| Token | Hex | Use |
|-------|-----|-----|
| `bg-canvas` | `#E6E6E8` | App background behind panels |
| `bg-surface` | `#F4F4F6` | Toolbar, side panels |
| `bg-elevated` | `#FFFFFF` | Modals, dropdowns |
| `border` | `#D1D1D6` | Dividers, panel borders |
| `text-primary` | `#18181B` | Body, headings |
| `text-secondary` | `#52525B` | Hints, labels |
| `accent` | `#3F6F5A` | Primary buttons, active tool |
| `accent-hover` | `#325A48` | Hover state |
| `accent-muted` | `#D8EBE2` | Selected item background |
| `danger` | `#C45C4A` | Destructive actions |
| `focus-ring` | `#3F6F5A` 2px | Keyboard focus |

#### Dark theme

| Token | Hex | Use |
|-------|-----|-----|
| `bg-canvas` | `#121214` | App background |
| `bg-surface` | `#1C1C21` | Panels |
| `bg-elevated` | `#26262D` | Modals |
| `border` | `#3A3A44` | Dividers |
| `text-primary` | `#EDEDEF` | Body |
| `text-secondary` | `#9B99A4` | Hints |
| `accent` | `#82C4A6` | Primary accent |
| `accent-hover` | `#9DD4B8` | Hover |
| `accent-muted` | `#1E3329` | Selected background |
| `danger` | `#E07060` | Destructive |
| `focus-ring` | `#82C4A6` 2px | Focus |

#### Canvas (functional — not brand)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `checker-a` | `#CCCCCC` | `#2A2A30` | Transparency checkerboard |
| `checker-b` | `#FFFFFF` | `#1F1F24` | Transparency checkerboard |
| `grid-line` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.06)` | Cell borders when zoomed in |
| `onion-skin` | `rgba(130,196,166,0.25)` | same | Future frame overlay |
| `active-frame` | 2px `accent` border | same | Frame strip highlight |

**Rule:** User palette swatches render at full saturation. Brand greens never tint canvas pixels.

### Theme behavior

- Ship **light** and **dark** in v1
- Default follows **OS preference** on first launch
- Persist user choice across sessions
- Theme toggle in header / settings

### Marketing-only color

| Element | Spec |
|---------|------|
| Hero gradient | `linear-gradient(135deg, #3F6F5A, #5AAF82)` |
| Hero background | Gradient at ~15% opacity over Mist |
| App UI buttons | **Flat** accent fill — no gradients in product chrome |

### CTA hierarchy (marketing)

| Role | Style |
|------|-------|
| Primary | Accent fill, white text (light) / Ink text (dark) |
| Secondary | Ink outline |
| Tertiary / link | Accent text, underline on hover |

No secondary hue (orange, purple) for CTAs. Open source product: **Download** + **View on GitHub**.

---

## Typography

### Font families

| Context | Font | Weights | Hosting |
|---------|------|---------|---------|
| App UI | **Outfit** | 400, 500, 600 | `@fontsource/outfit` |
| App data (coords, hex, FPS) | **JetBrains Mono** | 400, 500 | `@fontsource/jetbrains-mono` |
| Marketing hero headlines | **Sora** | 600 | `@fontsource/sora` (web only, lazy-loaded) |
| Marketing body | **Outfit** | 400 | same as app |

**Avoid:** Press Start 2P, VT323, or any pixel font in UI chrome.

### Type scale

| Token | Font | Size | Weight | Line height | Use |
|-------|------|------|--------|-------------|-----|
| `text-xs` | Outfit | 12px | 400 | 16px | Timestamps |
| `text-sm` | Outfit | 13px | 400 | 18px | Secondary labels only |
| `text-base` | Outfit | 14px | 400 | 20px | **Body minimum** |
| `text-md` | Outfit | 16px | 500 | 24px | Toolbar labels |
| `text-lg` | Outfit | 18px | 600 | 26px | Panel headings |
| `text-xl` | Outfit | 24px | 600 | 32px | Dialog titles |
| `text-mono` | JetBrains Mono | 13px | 400 | 18px | Coords, hex, FPS |
| `text-display` | Sora | 40–48px | 600 | 1.1 | Marketing hero only |

---

## Iconography

| Spec | Value |
|------|-------|
| Library | Lucide React (+ 1–2 custom pixel-workflow icons) |
| Style | Outline, 1.5px stroke |
| Icon size | 20×20 inside 24×24 box |
| Touch target | 40×40 minimum |
| Toolbar | Icon + text label below (required for accessibility) |
| Custom icons | "Duplicate to 8/16/32 frames" sprite-sheet icon |

Active tool state uses **accent background + bold label + 3px left border** — never color alone.

---

## Layout & spacing

### Editor shell

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

| Region | Behavior |
|--------|----------|
| Canvas | Minimum 60% viewport width; always centered hero |
| Left panel | Tools — icon + label |
| Right panel | Palette — collapsible section rail (Swatches, Presets, Shading, Filters); active tab persisted in `sessionStore` |
| Bottom strip | Frame picker + animation controls when `frameCount > 1` |
| Header | Logo lockup, menus, project name, theme toggle |

### Spacing & shape

| Aspect | Spec |
|--------|------|
| Spacing scale | 4px base — 4, 8, 12, 16, 24, 32 |
| Panel radius | 6px |
| Button radius | 4px |
| Swatch radius | 2px (sharp — digital honesty) |
| Elevation | Flat; borders over shadows (modals: soft shadow only) |
| Motion | 150ms ease panel toggle; **0ms** tool switch |
| Zoom range | 25%–3200% stepped; fit-to-view on open |
| Grid lines | Off at fit zoom; on at ≥8× |

### New project screen

Three equal-weight entry paths:

1. **Start blank** — resolution presets (16×16 through 256×256)
2. **From image** — import / pixelate wizard
3. **Animation** — toggle or card: 8 / 16 / 32 frames

### Empty states

Illustration-free. One sentence + primary CTA. No decorative mascots.

---

## Components

### Buttons

| Variant | Use |
|---------|-----|
| Primary | Main action (Save, Import, Play) |
| Secondary | Outline — cancel, alternate path |
| Ghost | Toolbar tools, toggles |
| Destructive | Ember color — rare (delete project) |

### Toolbar tools

| Tool | Icon (Lucide) | Notes |
|------|---------------|-------|
| Paint | `pencil` | Default active |
| Eraser | `eraser` | Label: "Fix mistakes" in onboarding |
| Eyedropper | `pipette` | Picks into active palette slot |
| Import | `image-plus` | Opens pixelate wizard |
| Frame duplicate | custom | Copies art to 8/16/32 frames |

### Palette panel

- Swatches in grid; active swatch: 2px accent ring + scale 1.05
- Swatches tab: horizontal **quick preset** chips (`PaletteQuickPresets`) with "See all" → Presets tab
- Add / remove / reorder colors
- **Palette lock** toggle (visible, not buried)
- Curated presets: Retro, Gameboy, Monochrome, NES, Pico-8, Pastel; import wizard also offers Match my image (4/8/16 colors)
- Optional color index overlay (View → Show technical info)

### Frame strip

- Thumbnails in horizontal scroll
- Click to edit; active frame: accent border
- During playback: dim strip, highlight current frame
- Controls: Play/Pause, FPS slider, loop toggle

---

## Canvas rendering

| Concern | Approach |
|---------|----------|
| Renderer | HTML Canvas 2D — separate from React UI layer |
| HiDPI | `devicePixelRatio` scaling |
| Input | Pointer events → grid cell coordinates |
| Animation preview | Same renderer, `readOnly` mode |
| Rule | Never overlay DOM elements on individual pixels |

---

## Frontend design system

Authoritative map from design tokens and components to files under `apps/web/`. **DESIGN.md** defines *what*; the paths below define *where*.

### Architecture

```text
DESIGN.md (tokens, components, voice)
       ↓
brand/colors.css          ← named palette (hex source)
       ↓
apps/web/src/styles/      ← semantic CSS variables + Tailwind bridge
       ↓
apps/web/src/components/ui/  ← Radix + CVA primitives (chrome only)
       ↓
shell/ + components/      ← feature UI composes primitives + tokens
       ↓
canvas/                   ← functional tokens only (checker, grid, swatches)
```

**Chrome vs viewport:** App panels, buttons, and typography use semantic tokens (`accent`, `bg-surface`, `text-primary`). The canvas viewport reads **functional** tokens (`checker-a`, `grid-line`, user palette swatches) — never brand greens on pixel data.

### Directory layout

```text
apps/web/
├── tailwind.config.js              # Tailwind extension → CSS variables
├── index.html                      # Root mount; favicon link
├── public/
│   └── logo-glyph.svg              # Grid mark (copied from brand/)
└── src/
    ├── main.tsx                    # Imports styles/globals.css
    ├── lib/
    │   └── cn.ts                   # clsx helper for UI primitives
    ├── styles/
    │   ├── globals.css             # Font imports, Tailwind layers, focus ring
    │   ├── tokens.css              # Semantic + canvas CSS variables
    │   └── theme.css               # Theme utilities (panel transitions)
    ├── components/
    │   └── ui/                     # Design-system primitives (no store imports)
    │       ├── index.ts            # Barrel exports
    │       ├── Button.tsx          # primary | secondary | ghost | destructive
    │       ├── DropdownMenu.tsx    # Header menus (Radix + tokens)
    │       ├── Dialog.tsx          # Modal shell (soft shadow only)
    │       ├── Tooltip.tsx         # Toolbar hints
    │       ├── Slider.tsx          # FPS slider (1–24), future controls
    │       └── tool-button.ts      # CVA: active tool (3px left border)
    ├── shell/                      # Editor chrome regions
    │   ├── AppHeader.tsx           # Logo, menus, project name, theme toggle
    │   ├── EditorLayout.tsx        # Region grid; canvas ≥60% width
    │   ├── LeftToolRail.tsx        # Tool buttons (uses toolButtonVariants)
    │   ├── RightPalettePanel.tsx   # Collapsible palette slot
    │   ├── BottomFrameStrip.tsx    # Frame strip (hidden when frameCount ≤ 1)
    │   ├── StatusBar.tsx           # Coords, zoom, API status
    │   └── useThemeBootstrap.ts    # Applies theme class on mount
    ├── state/
    │   └── sessionStore.ts         # Theme preference (light | dark | system)
    └── canvas/
        └── renderer.ts             # readCanvasTokens() from computed CSS vars

brand/                              # Repo-root brand assets (shared reference)
├── colors.css                      # Named palette hex values
└── logo-glyph.svg                  # 4×4 grid mark (accent bottom-right)
```

Feature folders (`components/palette/`, `components/animation/`, etc.) compose `components/ui/` primitives — they are documented in [ARCHITECTURE.md](./ARCHITECTURE.md) and the frontend standards skill, not duplicated here.

### Token pipeline

| DESIGN token | CSS variable (`tokens.css`) | Tailwind utility |
|--------------|----------------------------|------------------|
| `bg-canvas` | `--color-bg-canvas` | `bg-canvas` |
| `bg-surface` | `--color-bg-surface` | `bg-surface` |
| `bg-elevated` | `--color-bg-elevated` | `bg-elevated` |
| `border` | `--color-border` | `border-border` |
| `text-primary` | `--color-text-primary` | `text-primary` |
| `text-secondary` | `--color-text-secondary` | `text-secondary` |
| `accent` | `--color-accent` | `bg-accent`, `text-accent`, `border-accent` |
| `accent-hover` | `--color-accent-hover` | `bg-accent-hover` |
| `accent-muted` | `--color-accent-muted` | `bg-accent-muted` |
| `danger` | `--color-danger` | `bg-danger` |
| `focus-ring` | `--color-focus-ring` | `outline-focus-ring` |
| `checker-a` / `checker-b` | `--color-checker-a/b` | `bg-checker-a` (canvas only) |
| `grid-line` | `--color-grid-line` | — (read via `readCanvasTokens`) |
| `onion-skin` | `--color-onion-skin` | — (future frame overlay) |

Named palette (`Pixelanea Green`, `Ink`, `Ember`, …) lives in `brand/colors.css`. Semantic roles in `tokens.css` reference those values; **do not hard-code hex in React components**.

### Typography tokens

| Token | Tailwind | Source |
|-------|----------|--------|
| `text-xs` … `text-xl` | `text-xs` … `text-xl` | `tailwind.config.js` `fontSize` |
| `text-mono` | `font-mono text-sm` | JetBrains Mono via `@fontsource` in `globals.css` |
| `text-display` | — | Sora — marketing site only, not shipped in app bundle |

Fonts load in `globals.css`:

```css
@import "@fontsource/outfit/400.css";
@import "@fontsource/outfit/500.css";
@import "@fontsource/outfit/600.css";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";
```

### Shape & spacing tokens

| Spec | Tailwind key | Value |
|------|--------------|-------|
| Spacing scale | `p-1` … `p-8` | 4, 8, 12, 16, 24, 32 px |
| Panel radius | `rounded-panel` | 6px |
| Button radius | `rounded-button` | 4px |
| Swatch radius | `rounded-swatch` | 2px |
| Panel animation | `transition-panel` | 150ms ease (`theme.css`) |
| Tool switch | — | 0ms (instant) |

### UI primitives (`components/ui/`)

Built with **Radix UI** (unstyled) + **class-variance-authority** + Tailwind semantic tokens. No `editorStore` or API imports.

| Component | Variants / API | DESIGN rule |
|-----------|----------------|-------------|
| `Button` | `primary`, `secondary`, `ghost`, `destructive`; sizes `default`, `icon` | Destructive uses `danger` token only; min 40×40 touch target |
| `DropdownMenu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` | Header menus; token-styled content + items |
| `Dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` | Soft shadow on content; flat elsewhere |
| `Tooltip` | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` | Toolbar hints; not required on every control |
| `Slider` | Radix slider with accent track | FPS 1–24 in animation panel |
| `toolButtonVariants` | CVA `active: true \| false` | Accent bg + **3px left border** + semibold label |

Import from the barrel:

```typescript
import { Button, Dialog, DialogContent, Slider, Tooltip, toolButtonVariants } from "@/components/ui";
```

### Shell patterns

| Region | Module | Key tokens / classes |
|--------|--------|----------------------|
| Header | `AppHeader` | `bg-surface`, `border-border`, `text-md` |
| Tool rail | `LeftToolRail` | `toolButtonVariants`, Lucide 20px / stroke 1.5 |
| Palette panel | `RightPalettePanel` | `transition-panel`, `PaletteSectionRail` (4 tabs), collapsible width from `sessionStore` |
| Canvas area | `EditorLayout` | `bg-canvas`, `min-w-[60vw]` on canvas column |
| Frame strip | `BottomFrameStrip` | Hidden when `frameCount ≤ 1`; `border-accent` on active frame |

### Theme system

| Step | Module | Behavior |
|------|--------|----------|
| 1 | `sessionStore` | Persists `theme: "light" \| "dark" \| "system"` in `localStorage` |
| 2 | `resolveTheme()` | Maps `"system"` → `prefers-color-scheme` |
| 3 | `applyThemeToDocument()` | Toggles `.dark` on `<html>` |
| 4 | `useThemeBootstrap()` | Runs on app mount in `EditorPage` |
| 5 | `tokens.css` | `.dark` block overrides semantic variables |

`prefers-reduced-motion` is handled in `globals.css` (disables transitions) and `theme.css` (panel utility).

### Canvas token consumption

```typescript
// canvas/renderer.ts
export function readCanvasTokens(element: HTMLElement): CanvasTokens {
  const style = getComputedStyle(element);
  return {
    checkerA: style.getPropertyValue("--color-checker-a").trim(),
    checkerB: style.getPropertyValue("--color-checker-b").trim(),
    gridLine: style.getPropertyValue("--color-grid-line").trim(),
  };
}
```

Grid lines render at zoom ≥8×; checkerboard always behind pixels. HiDPI via `devicePixelRatio` in `setupHiDpiCanvas()`.

### Stack summary

| Library | Role |
|---------|------|
| React + Vite | App shell |
| Tailwind CSS | Utility classes from CSS variables |
| class-variance-authority | Component + tool-button variants |
| Radix UI Primitives | Dialog, dropdown, tooltip, slider, slot |
| Zustand | Editor + session state |
| Lucide React | Icons (outline, 1.5px stroke) |
| @fontsource/* | Self-hosted fonts |

See [DEPENDENCIES.md](./DEPENDENCIES.md) for package versions.

### Tailwind config reference

```js
// apps/web/tailwind.config.js — colors map to CSS variables in tokens.css
colors: {
  canvas: "var(--color-bg-canvas)",
  surface: "var(--color-bg-surface)",
  elevated: "var(--color-bg-elevated)",
  border: "var(--color-border)",
  primary: "var(--color-text-primary)",
  secondary: "var(--color-text-secondary)",
  accent: {
    DEFAULT: "var(--color-accent)",
    hover: "var(--color-accent-hover)",
    muted: "var(--color-accent-muted)",
  },
  danger: "var(--color-danger)",
  "focus-ring": "var(--color-focus-ring)",
  "checker-a": "var(--color-checker-a)",
  "checker-b": "var(--color-checker-b)",
},
darkMode: "class",
```

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| WCAG 2.1 AA | Pre-checked token pairs |
| Body text | 14px minimum |
| Keyboard | All tools tabbable; shortcuts in `?` overlay |
| Focus | 2px accent ring — never remove without replacement |
| Color-blind | Active tool: border + weight + icon, not hue alone |
| Reduced motion | `prefers-reduced-motion` disables panel animation |
| i18n | Externalized strings; layout tolerates +30% text expansion |
| Projector | High contrast Mist + Pixelanea Green buttons (classroom) |

---

## Product vs marketing

| Element | Product (app) | Marketing (web) |
|---------|---------------|-----------------|
| Wordmark | Solid Ink | Split Pixel / anea colors |
| Headlines | Outfit | Sora (hero only) |
| Gradients | None | Hero background only |
| Saturation | Calm neutrals | ~10% bolder accent in banners |
| Hero content | — | User sprite screenshot as hero image |

Marketing can be **10% bolder**. The app stays calm so creative work stays in focus.

---

## Asset checklist

| Asset | Path | Status |
|-------|------|--------|
| Named palette | `brand/colors.css` | Done |
| Logo glyph | `brand/logo-glyph.svg` | Done |
| Logo glyph (app) | `apps/web/public/logo-glyph.svg` | Done — sync from `brand/` |
| Semantic tokens | `apps/web/src/styles/tokens.css` | Done |
| Theme utilities | `apps/web/src/styles/theme.css` | Done |
| Global styles | `apps/web/src/styles/globals.css` | Done |
| Tailwind extension | `apps/web/tailwind.config.js` | Done |
| UI primitives | `apps/web/src/components/ui/` | Done (Button, DropdownMenu, Dialog, Tooltip, Slider) |
| Logo lockup | `brand/logo-lockup.svg` | Pending |
| Logo mark | `brand/logo-mark.svg` | Pending |
| Wordmark | `brand/logo-wordmark.svg` | Pending |
| Favicon set | `apps/web/public/favicon/` | Pending |
| App icons | `apps/web/public/icons/` | Pending |
| File type icon | `.pixelanea` association | Pending |

---

## Related documents

| Document | Contents |
|----------|----------|
| [UX.md](./UX.md) | Personas, flows, creative-freedom principles |
| [BRAINSTORM.md](./BRAINSTORM.md) | Workshop transcripts and rationale |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical system design |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Package and library management |
