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
   ./scripts/dev.sh
   ```

4. Run tests before opening a PR:

   ```bash
   pnpm test
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

## Pull request checklist

- [ ] `pnpm test` passes locally
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

- OS and browser (for UI bugs)
- Steps to reproduce
- Expected vs actual behavior
- Whether the API health endpoint responds (`/api/health`)

## Questions

Read [UX.md](./UX.md) for product intent and [BACKLOG.md](./BACKLOG.md) for planned work before starting large features. Prefer extending via new tools, commands, or repositories over `if` chains in core modules.
