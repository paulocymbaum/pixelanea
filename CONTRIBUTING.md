# Contributing to Pixelanea

Thank you for helping build a free, local-first pixel art editor. This guide covers setup, architecture rules, and how to submit changes.

## Development setup

1. Install prerequisites from [DEPENDENCIES.md](./DEPENDENCIES.md).
2. Clone the repo and install JS dependencies:

   ```bash
   pnpm install
   pnpm generate:api
   ```

3. Start the dev stack (C++ API + Vite):

   ```bash
   pnpm dev
   ```

4. Run tests before opening a PR:

   ```bash
   pnpm typecheck
   pnpm test:unit
   pnpm test:qa        # if you touched routes, guards, or I/O
   pnpm test:smoke     # full smoke gate before merge
   ```

## Architecture rules

Pixelanea enforces strict layer boundaries. Read [ARCHITECTURE.md](./ARCHITECTURE.md) and [PRACTICES.md](./PRACTICES.md) before changing code.

| Rule | Summary |
|------|---------|
| Dependency direction | `apps/web` → OpenAPI client → `server/api` → `domain` ← `db/`, `export/`, `image/` |
| UI never touches SQLite | All persistence goes through the generated API client |
| Domain stays pure | No HTTP, React, ZIP, or stb in `server/domain/` |
| Contract-first API | Change `contracts/openapi.yaml` first, then regenerate the client |
| Tools are plugins | New edit behavior = `Tool` + `Command` in `apps/web/src/tools/` |

### Frontend layers (`apps/web/src`)

```text
pages/ → shell/, components/, canvas/
canvas/ + tools/ → state/ (commands)
state/ → api/ (generated client)
content/ → user-facing strings (no React imports)
```

See `.cursor/skills/pixelanea-frontend-standards/SKILL.md` for detailed frontend conventions.

## Desktop shell development

| Task | Command |
|------|---------|
| Browser desktop (no Rust) | `pnpm desktop` or `./scripts/install-desktop-linux.sh` |
| Install shell build deps | `./scripts/install-desktop-shell-build-deps.sh` |
| Native shell (dev) | `pnpm desktop:shell` |
| Build shell release binary | `pnpm build:desktop-shell` |
| Package `.deb` | `pnpm package:deb` (output in `dist/`, gitignored) |
| Portable `.tar.gz` | `pnpm package:desktop` |
| Package smoke tests | `pnpm test:package:linux`, `pnpm test:desktop-shell` |

Rust build artifacts live under `apps/desktop/src-tauri/target/` (gitignored). See [DEPENDENCIES.md](./DEPENDENCIES.md) for WebKitGTK system packages.

## Making changes

### API or schema changes

1. Edit `contracts/openapi.yaml`.
2. Add or update SQL migration in `server/db/migrations/` if needed.
3. Run `pnpm generate:api`.
4. Implement handler in `server/api/` and repository in `server/db/`.
5. Update frontend via generated client types — no hand-rolled fetch DTOs.

### New drawing tool

1. Add `Tool` implementation in `apps/web/src/tools/`.
2. Register in the tool registry and `content/tools.ts`.
3. Add toolbar entry in `shell/LeftToolRail` or tool config.
4. Honor `readOnly` during animation playback.
5. Add unit tests alongside existing tool tests.

### Copy and UX

- All user-facing strings live in `apps/web/src/content/`.
- Use plain language — no error codes in toasts.
- Confirm dialogs only for destructive actions (delete, overwrite, remove in-use color).
- Post-MVP surfaces can be toggled in `content/features.ts` for experiments — defaults ship spritesheet, GIF, and onion skin.

## Testing

| Layer | Command | When |
|-------|---------|------|
| Typecheck | `pnpm typecheck` | Always |
| Unit / integration | `pnpm test:unit` | Touched `apps/web` |
| QA matrices | `pnpm test:qa` | Route guards, I/O, import, animation |
| Backend unit | `ctest --test-dir server/build` | Touched `server/` |
| Smoke gate | `pnpm test:smoke` (or `test:smoke:backend` / `test:smoke:frontend`) | Before merge; mirrors CI smoke steps |
| E2E | `pnpm test:e2e` | User flows; install browsers with `pnpm test:e2e:install` first |
| Desktop package | `pnpm test:package:linux` | Touched `package-deb.sh`, `stage-linux-desktop.sh`, or `.deb` staging |
| Desktop shell | `pnpm test:desktop-shell` | Touched `apps/desktop/` or shell launch scripts |
| Sprint gate | `./scripts/ci-sprint1.sh` | Before sprint-close PRs |

QA matrix harnesses under `apps/web/src/qa/` encode regression cases from the MVP Gherkin spec. Playwright specs in `e2e/` cover `@smoke` and `@routing` scenarios; `playwright.config.ts` starts the stack via `scripts/e2e-webserver.sh`.

## Pull request checklist

- [ ] `pnpm typecheck` and `pnpm test:unit` pass locally (or scoped commands for your change)
- [ ] `pnpm test:qa` green if you touched routes, guards, or I/O
- [ ] `pnpm test:smoke` green before merge when touching build or integration paths
- [ ] Shell/packaging changes: `pnpm test:package:linux` and/or `pnpm test:desktop-shell` green
- [ ] Do not commit `dist/`, `apps/desktop/src-tauri/target/`, or `**/.pixelanea-assets-hash`
- [ ] Do not commit README demo videos (`docs/media/linkedin/*.mp4`, `*.webm`, `fixtures/`) — GIFs only
- [ ] Tauri/Rust or `DEBIAN/control` changes: note WebKitGTK runtime deps in PR description
- [ ] OpenAPI updated if API shape changed; client regenerated
- [ ] No layer boundary violations (UI → API only)
- [ ] New copy in `content/`, not inline in components
- [ ] BACKLOG.md updated if completing a tracked item
- [ ] Focused diff — one concern per PR when possible

## Code style

- **TypeScript:** match existing patterns; run `pnpm lint`
- **C++:** C++17; Catch2 for server tests
- **Commits:** imperative subject; explain *why* in the body when non-obvious

## Reporting issues

Include:

- OS and version (for UI bugs)
- Native shell (`pixelanea-shell`) vs browser fallback (`pixelanea-browser`)
- WebKitGTK version if using the native window (`dpkg -l libwebkit2gtk-4.1-0`)
- Steps to reproduce
- Expected vs actual behavior
- Whether the API health endpoint responds (`/api/health`)
- Status bar message and whether the connection banner is visible

## Questions

Read [UX.md](./UX.md) for product intent and [BACKLOG.md](./BACKLOG.md) for planned work before starting large features. Prefer extending via new tools, commands, or repositories over `if` chains in core modules.
