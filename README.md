# Pixelanea

**Make pixel art. Keep it local.**

Free, open-source, local-only pixel art editor. Draw on a grid, pixelate photos, animate in 8/16/32 frames, and share a single `.pixelanea` project file — no accounts, subscriptions, or cloud required.

## Features

- **Two front doors** — start from a blank canvas or import an image through the pixelate wizard
- **Drawing tools** — paint, eraser, eyedropper, fill bucket, and line tool
- **Palette editor** — add/edit colors, presets (Retro, Gameboy, Monochrome), palette lock, procedural shading ramps (under **More tools**)
- **Undo / redo** — client-side command stack (500 steps) with Ctrl+Z / Ctrl+Shift+Z
- **Animation** — duplicate to 8/16/32 frames, frame copy/reorder, play/pause with FPS and loop
- **Project I/O** — native file pickers for save/open; asset types (Character, Prop, Background, Animation)
- **Save trust** — status bar shows saved / unsaved / saving; connection banner when the API is unreachable
- **Export** — File → Export: PNG (current frame), spritesheet (all frames), GIF animation
- **Animation aids** — onion skin toggle when working with multiple frames
- **Themes** — light/dark with OS preference; keyboard shortcuts overlay (`?`)
- **Accessibility** — icon + label tools, focus rings, `prefers-reduced-motion`

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, TypeScript, Tailwind (`apps/web`) |
| Backend | C++17, cpp-httplib, SQLite (`server/`) |
| Contract | OpenAPI → TypeScript client (`contracts/`, `packages/api-client`) |

## Desktop install (recommended)

For workshops and daily use, install the local desktop launcher (single process — no separate dev server):

```bash
./scripts/install-desktop-linux.sh
pixelanea
```

See [docs/user-guide.md](./docs/user-guide.md) for details.

**Developers:** `pnpm package:deb` builds a `.deb` in `dist/`; `pnpm package:desktop` builds a portable `.tar.gz`. These paths are gitignored — never commit build artifacts.

## Developer quick start

**Prerequisites:** Node 20+, pnpm 9+, CMake, C++17 compiler, vcpkg — see [DEPENDENCIES.md](./DEPENDENCIES.md).

```bash
pnpm install
pnpm generate:api
pnpm dev
```

| Service | URL |
|---------|-----|
| Web UI (dev) | http://localhost:5173 |
| API health | http://127.0.0.1:8787/api/health |
| Desktop app | http://127.0.0.1:8787 (after `install-desktop-linux.sh`) |

**Sample projects** for testing File → Open: [`examples/projects/`](./examples/projects/) (blank canvas, sprites, animations).

## Tests

```bash
# Fast feedback (seconds–minutes)
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:qa

# Full smoke gate (install, build, live server checks)
pnpm test:smoke
pnpm test:smoke:frontend   # frontend smoke only
pnpm test:smoke:backend    # backend smoke only

# Backward-compatible aliases
pnpm test                  # same as test:smoke

# Playwright E2E (@smoke + @routing — requires Chromium)
pnpm test:e2e:install   # first time only
pnpm test:e2e

# Sprint 1 local gate (tsc + QA matrices + unit + optional E2E + backend)
./scripts/ci-sprint1.sh
```

CI runs `typecheck`, `lint`, `test:qa`, `test:unit`, backend tests, and smoke scripts on every PR — see [`.github/workflows/build.yml`](.github/workflows/build.yml).

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/user-guide.md](./docs/user-guide.md) | End-user walkthrough |
| [docs/shortcuts.md](./docs/shortcuts.md) | Keyboard shortcuts reference |
| [docs/workshop/teacher-guide.md](./docs/workshop/teacher-guide.md) | Classroom workshop guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and layer boundaries |
| [UX.md](./UX.md) | User flows and personas |
| [DESIGN.md](./DESIGN.md) | UI tokens and layout |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Install and dependency pinning |
| [BACKLOG.md](./BACKLOG.md) | Product roadmap (Sprint 2+) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |

## Project layout

```text
pixelanea/
├── apps/web/            # React editor
├── server/              # C++ API + SQLite + bundle I/O
├── contracts/           # OpenAPI spec
├── packages/api-client/   # Generated TS client
├── e2e/                 # Playwright E2E specs
├── examples/projects/   # Sample .pixelanea files for File → Open
├── brand/               # Logo and color assets
├── docs/                # User and workshop guides
└── scripts/
    ├── dev.sh           # Start API + Vite with proxy
    ├── ci-sprint1.sh    # Sprint 1 quality gate
    └── e2e-webserver.sh # Stack for Playwright
```

## Status

Core editor and Sprint 1 trust/flow work are complete (2026-08-01). **Sprint 2+** focuses on wiring export/animation features, desktop install, and v1.0 launch — see [BACKLOG.md](./BACKLOG.md).

## License

License: MIT — see [LICENSE](./LICENSE).
