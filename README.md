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
- **Export** — PNG (current frame); spritesheet and GIF available behind feature flags (see below)
- **Themes** — light/dark with OS preference; keyboard shortcuts overlay (`?`)
- **Accessibility** — icon + label tools, focus rings, `prefers-reduced-motion`

### Post-MVP feature flags

Advanced export and animation chrome are gated in [`apps/web/src/content/features.ts`](apps/web/src/content/features.ts). Defaults keep the Sprint 1 UI minimal (PNG export only; onion skin hidden). Set a flag to `true` locally to re-enable that surface.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, TypeScript, Tailwind (`apps/web`) |
| Backend | C++17, cpp-httplib, SQLite (`server/`) |
| Contract | OpenAPI → TypeScript client (`contracts/`, `packages/api-client`) |

## Quick start

**Prerequisites:** Node 20+, pnpm 9+, CMake, C++17 compiler, vcpkg — see [DEPENDENCIES.md](./DEPENDENCIES.md).

```bash
pnpm install
pnpm generate:api
./scripts/dev.sh
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API health | http://127.0.0.1:8787/api/health |

## Tests

```bash
# Full suite (backend + frontend unit tests)
pnpm test

# Frontend only
pnpm test:frontend

# Backend only
pnpm test:backend

# QA matrix harness (route/race regression suites)
pnpm --filter @pixelanea/web exec vitest run src/qa/

# Playwright E2E (@smoke + @routing — requires Chromium)
pnpm test:e2e:install   # first time only
pnpm test:e2e

# Sprint 1 local gate (tsc + QA matrices + unit + optional E2E + backend)
./scripts/ci-sprint1.sh
```

CI runs typecheck, lint, QA matrices, unit tests, backend tests, and smoke scripts on every PR — see [`.github/workflows/build.yml`](.github/workflows/build.yml).

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
| [BACKLOG.md](./BACKLOG.md) | Product roadmap |
| [BACKLOG_SPRINT_1.md](./BACKLOG_SPRINT_1.md) | Sprint 1 trust & flow hardening (complete) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |

## Project layout

```text
pixelanea/
├── apps/web/            # React editor
├── server/              # C++ API + SQLite + bundle I/O
├── contracts/           # OpenAPI spec
├── packages/api-client/   # Generated TS client
├── e2e/                 # Playwright E2E specs
├── brand/               # Logo and color assets
├── docs/                # User and workshop guides
└── scripts/
    ├── dev.sh           # Start API + Vite with proxy
    ├── ci-sprint1.sh    # Sprint 1 quality gate
    └── e2e-webserver.sh # Stack for Playwright
```

## Status

Phase 1 MVP and Phase 2 export/animation polish are complete. **Sprint 1** (trust & flow hardening — native pickers, save status, Playwright E2E, QA matrices) closed 2026-08-01. v1.0 launch work (marketing site, release builds, cross-platform QA) is in progress — see [BACKLOG.md](./BACKLOG.md).

## License

License file pending (see BACKLOG DOC-010).
