# Pixelanea

**Make pixel art. Keep it local.**

Free, open-source, local-only pixel art editor: draw on a grid, manage palettes, animate frames, and save projects via a local C++ API and SQLite — no accounts or cloud required.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind (`apps/web`)
- **Backend:** C++17 + cpp-httplib + SQLite (`server/`)
- **Contract:** OpenAPI → TypeScript client (`contracts/`, `packages/api-client`)

## Quick start

**Prerequisites:** Node 20+, pnpm 9+, CMake, g++, vcpkg (see [DEPENDENCIES.md](./DEPENDENCIES.md))

```bash
pnpm install
pnpm generate:api
./scripts/dev.sh
```

- Web UI: http://localhost:5173  
- API: http://127.0.0.1:8787/api/health

## Tests

```bash
pnpm test:frontend
pnpm test:backend
```

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design
- [UX.md](./UX.md) — user flows and personas
- [DESIGN.md](./DESIGN.md) — UI tokens and layout
- [BACKLOG.md](./BACKLOG.md) — product roadmap

## Status

MVP in progress (Phase 1): canvas drawing, palette editing, undo/redo, frame duplicate API, and editor shell are implemented. Save/open `.pixelanea` bundles and import wizard are upcoming.
