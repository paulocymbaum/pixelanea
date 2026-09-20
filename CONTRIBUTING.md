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
   pnpm ci:fast              # lint, typecheck, QA matrix, unit tests, skill-output smoke
   pnpm ci:core              # fast + web/server build + backend unit tests
   pnpm ci:e2e               # full Playwright E2E (local / PR opt-in)
   pnpm ci:e2e-nightly       # @smoke + @race Playwright (matches nightly CI job)
   ./scripts/ci.sh           # full gate (matches GitHub Actions build job)
   ```

   **When CI runs what**

   | Gate | GitHub Actions | Local command |
   |------|----------------|---------------|
   | Lint, typecheck, unit, QA, builds, smoke | Every PR — [`build.yml`](.github/workflows/build.yml) | `./scripts/ci.sh` or `pnpm ci:core` |
   | Skill-output smoke | Every PR — step 14 in `build.yml` | `pnpm ci:fast` |
   | Playwright `@smoke` + `@race` | Nightly on `main` + manual dispatch — [`e2e-nightly.yml`](.github/workflows/e2e-nightly.yml) | `pnpm ci:e2e-nightly` |
   | Full Playwright (all specs except LinkedIn / `@perf`) | Not automated on PRs | `pnpm ci:e2e` |

   **Run E2E locally before merge when you touch:**

   - `apps/web/src/state/sync/`, `persist.ts`, or frame/palette API wrappers
   - `server/` frame or project HTTP handlers
   - `e2e/` specs or `scripts/e2e-webserver.sh`

   Install browsers once: `pnpm test:e2e:install` (add `--with-deps` on fresh Linux CI images).

   Git hooks split work to avoid duplicate runs: **pre-commit** runs lint + typecheck;
   **pre-push** runs tests + builds. Use `PRE_PUSH_CI=core` to re-run lint on push.

   Or run individual steps: `./scripts/ci.sh list` · see `scripts/ci-steps/README.md`.

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
| Windows NSIS + portable zip | `pnpm package:windows` (Windows host or CI `package-windows` job) |
| Package smoke tests | `pnpm test:package:linux`, `pnpm test:package:windows`, `pnpm test:desktop-shell` |
| CLI PNG export (spike) | `pnpm export:cli -- export path/to/project.pixelanea --format png [--output out.png]` |

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
- Onion skin, spritesheet, and GIF export ship in the default UI.
- Experimental headless PNG: `pnpm export:cli` / `pixelanea-cli export` (PNG-only; not the full File → Export surface).

## Testing

| Layer | Command | When |
|-------|---------|------|
| Typecheck | `pnpm typecheck` | Always |
| Unit / integration | `pnpm test:unit` | Touched `apps/web` |
| QA matrices | `pnpm test:qa` | Route guards, I/O, import, animation |
| Perf regressions | `pnpm test:perf` | Hot-path benchmarks (ctest `[benchmark]` + vitest `*Perf.test.ts`) |
| Backend unit | `./scripts/ci-steps/09-test-backend-unit.sh` | Touched `server/` |
| CI profiles | `pnpm ci:fast` / `ci:core` / `ci:e2e` / `ci:e2e-nightly` / `./scripts/ci.sh` | See `scripts/ci-steps/README.md` |
| Smoke gate | `pnpm test:smoke` | Standalone; skips redundant checks when `CI_SKIP_REDUNDANT=1` |
| E2E (full) | `pnpm test:e2e --grep-invert 'LinkedIn\|@perf'` | All product specs (~40 cases): `@smoke`, `@race`, `@routing`, `@export`, `@import`, `@onboarding`, `@errors`, palette rail; excludes LinkedIn media capture and `@perf` |
| E2E (smoke-race gate) | `pnpm test:e2e:smoke-race` | `@smoke` + `@race` only — same subset as nightly CI |
| E2E (CI full profile) | `pnpm ci:e2e` | Core gate + full Playwright (frees port 5173; use when no dev server running) |
| Desktop package | `pnpm test:package:linux` | Touched `package-deb.sh`, `stage-linux-desktop.sh`, or `.deb` staging |
| Windows package | `pnpm test:package:windows` | Touched `package-windows.ps1` or Windows CI job |
| Native server (Win/mac) | `./scripts/ci-native-server-tests.sh` | Migrations resolve + file-dialog providers; CI jobs `test-server-windows` (`windows-latest`) and `test-server-macos` (`macos-15`, `macos-15-intel`) |
| CLI export | `./scripts/ci-steps/09-test-backend-unit.sh` (filter `[cli][export]`) or `pnpm export:cli -- export …` | Touched `server/src/cli/` or `server/src/export/png_encoder.*` |
| Desktop shell | `pnpm test:desktop-shell` | Touched `apps/desktop/` or shell launch scripts |
| Sprint gate | `pnpm ci:sprint` (`./scripts/ci.sh sprint`) | Before sprint-close PRs |

QA matrix harnesses under `apps/web/src/qa/` encode regression cases from the MVP Gherkin spec. Playwright specs in `e2e/` cover `@smoke`, `@race`, `@routing`, `@sync`, `@export`, `@import`, and palette rail scenarios; `playwright.config.ts` starts the stack via `scripts/e2e-webserver.sh` (or reuses an existing dev server locally). Nightly CI runs `@smoke` + `@race` only (see `.github/workflows/e2e-nightly.yml`). Run the full Playwright suite before batch closes or when touching status bar, routing guards, import/export, or palette panel.

## Pull request checklist

- [ ] `pnpm typecheck` and `pnpm test:unit` pass locally (or scoped commands for your change)
- [ ] `pnpm test:qa` green if you touched routes, guards, or I/O
- [ ] `pnpm test:e2e:smoke-race` or `pnpm ci:e2e-nightly` green if you touched `state/sync/`, `persist.ts`, frame/palette API, or related `e2e/` specs
- [ ] `pnpm test:e2e --grep-invert 'LinkedIn|@perf'` green before merge when closing a multi-batch milestone or touching routing guards, status bar, import/export, or palette panel
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

- **TypeScript:** match existing patterns; run `pnpm lint` (or `pnpm lint:web`)
- **C++:** C++17; Catch2 for server tests; run `pnpm lint:cpp` for layer-boundary checks
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
