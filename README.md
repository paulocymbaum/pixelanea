# Pixelanea

**Make pixel art. Keep it local.**

Free, open-source, local-only pixel art editor. Draw on a grid, pixelate photos, animate in 8/16/32 frames, and share a single `.pixelanea` project file — no accounts, subscriptions, or cloud required.

## Features

- **Two front doors** — start from a blank canvas or import an image through the pixelate wizard
- **Drawing tools** — paint, eraser, eyedropper, fill bucket, and line tool
- **Palette editor** — add/edit colors, presets (Retro, Gameboy, Monochrome), palette lock, procedural shading ramps
- **Undo / redo** — client-side command stack (500 steps) with Ctrl+Z / Ctrl+Shift+Z
- **Animation** — duplicate to 8/16/32 frames, onion skin, frame copy/reorder, play/pause with FPS and loop
- **Project I/O** — save and open `.pixelanea` bundles; asset types (Character, Prop, Background, Animation)
- **Export** — PNG (current frame), PNG spritesheet, GIF; off-palette warning before export
- **Themes** — light/dark with OS preference; keyboard shortcuts overlay (`?`)
- **Accessibility** — icon + label tools, focus rings, `prefers-reduced-motion`

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
pnpm test:frontend
pnpm test:backend
```

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
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |

## Project layout

```text
pixelanea/
├── apps/web/           # React editor
├── server/             # C++ API + SQLite + bundle I/O
├── contracts/          # OpenAPI spec
├── packages/api-client/ # Generated TS client
├── brand/              # Logo and color assets
├── docs/               # User and workshop guides
└── scripts/dev.sh      # Start API + Vite with proxy
```

## Status

Phase 1 MVP and Phase 2 export/animation polish are complete. v1.0 launch work (marketing site, release builds, QA) is in progress — see [BACKLOG.md](./BACKLOG.md).

## License

License file pending (see BACKLOG DOC-010).
