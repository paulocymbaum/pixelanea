---
name: pixelanea-cpp-standards
description: Enforces Pixelanea C++ server architecture, performance patterns, and SOLID/DRY/Clean Code practices from ARCHITECTURE.md. Use when writing or reviewing server/ code, CMake, repositories, domain models, image pipeline, bundle I/O, SQLite persistence, API handlers, or when the user asks about C++ standards for this project.
---

# Pixelanea C++ Standards

Standards for `server/` derived from [ARCHITECTURE.md](../../../ARCHITECTURE.md). Apply on every C++ change.

**Before investigating:** `./.venv-graphify/bin/graphify query "<topic>"` then `search_backend_elements.py` — see [pixelanea-token-efficiency.mdc](../../rules/pixelanea-token-efficiency.mdc).

## Dependency rule (non-negotiable)

```
api/  →  domain/  ←  db/, export/, image/
         (pure)
```

| Layer | May depend on | Must NOT depend on |
|-------|---------------|-------------------|
| `domain/` | Standard library only | `api/`, `db/`, SQLite, HTTP, ZIP, stb |
| `db/` | `domain/`, SQLite | `api/`, HTTP |
| `image/` | `domain/`, stb | `api/`, SQLite |
| `export/` | `domain/`, libzip/miniz | `api/`, SQLite (read DB path via caller) |
| `api/` | All below layers | Direct SQL, filesystem bundle logic inline |

**UI depends on OpenAPI contracts; the server depends on domain and persistence abstractions—not the other way around.**

## Module map

| Path | Responsibility |
|------|----------------|
| `api/` | HTTP routing, JSON (nlohmann-json), request validation, error responses |
| `domain/` | `Project`, `Frame`, `Palette`, `PixelGrid`, command types—pure logic |
| `db/` | Schema, migrations, connection management, repositories |
| `export/` | `.pixelanea` pack/unpack, manifest, checksum validation |
| `image/` | stb decode → downscale → palette quantization |

Route handlers are thin: validate → call domain/repo → serialize. No business rules in handlers.

## SOLID (project-specific)

### Single Responsibility

- One class per persistence aggregate: `ProjectRepository`, `FrameRepository`, `PaletteRepository`.
- `image/` only transforms pixels; `export/` only bundles; `api/` only transports.
- Split files when a translation unit mixes HTTP, SQL, or pixel math.

### Open/Closed

- Extend via new repository implementations or new `image/` pipeline stages—not by editing handlers.
- Future adapters (CLI exporter, cloud sync) sit behind existing repository interfaces (see ARCHITECTURE scalability table).

### Liskov Substitution

- Repository interfaces must work for temp-dir DBs (opened bundles) and on-disk project paths without callers branching on storage mode.

### Interface Segregation

- Keep repositories narrow (`FrameRepository` does not expose project metadata).
- Pass `ProjectId` / `ProjectHandle` instead of fat context objects.

### Dependency Inversion

- `api/` receives repositories via construction or a small service layer—never `sqlite3_*` calls.
- Domain types are plain structs/classes; persistence maps them in `db/`.

## DRY

- **One schema source:** SQL in `server/db/migrations/`; version in `app_meta.schema_version`.
- **One API contract:** `contracts/openapi.yaml`—handlers match it; do not invent parallel JSON shapes.
- **One pixel encoding:** palette-index or RGBA + RLE/LZ4 rules live in `domain/` or a shared `db/` codec—never duplicated in `export/` and `api/`.
- **One error mapping:** central HTTP status + JSON error body helper in `api/`.

## Clean Code

- C++17+; prefer `std::optional`, `std::variant`, `std::string_view` where appropriate.
- Use `std::filesystem::path` for all paths; reject path traversal on bundle unpack.
- Naming: `snake_case` for functions/variables, `PascalCase` for types—match existing files in the module.
- No raw `new`/`delete`; use RAII (`unique_ptr`, containers).
- Return rich errors (`std::expected` or project error type) from domain/repos; map to HTTP at the API boundary only.
- Keep functions short; extract when a function does validation + persistence + serialization.

## Performance

### Hot paths (optimize here)

| Path | Target | Techniques |
|------|--------|------------|
| Image pixelate | `POST /import/pixelate` | stb decode once; downscale before quantize; avoid per-pixel allocations; reuse buffers |
| Frame GET/PUT | Frequent autosave | Pre-sized `pixel_blob`; RLE or LZ4 over raw grid; batch writes |
| Bundle save/open | User-visible latency | WAL checkpoint then pack; atomic `*.tmp` → rename |
| Preview WebSocket (optional) | Steady FPS | Stream compressed blobs or deltas; avoid re-encoding every frame |

### Pixel blob format (mandatory)

- Encoding: 1 byte palette index (≤256 colors) or RGBA.
- Compression: RLE or LZ4 over grid bytes.
- Optional CRC32 in `app_meta` for integrity.
- A 64×64 grid × 32 frames should stay well under 1 MB—profile if larger.

### General C++ performance

- **Avoid copies:** pass `const Frame&`, return blobs with move; use `reserve()` on vectors.
- **Avoid exceptions on hot paths** for expected failures; use error returns in inner loops.
- **No synchronous work in request thread** that blocks the UI for large images—chunk or stream progress (WebSocket) if needed.
- **SQLite:** single connection per open project; prepared statements in repositories; `PRAGMA journal_mode=WAL`; checkpoint on save.
- **Build:** Ninja + ccache when available (`DEPENDENCIES.md`).
- **Third-party:** prefer header-only stb in `image/`; embed sqlite/httplib per project layout—no unnecessary dynamic dispatch.

### What not to optimize in C++

- Per-pixel canvas rendering—that stays in `apps/web` (HTML Canvas 2D).
- Undo/redo stack—that is client-side; server persists **resulting grids**, not command history.

## Security & I/O (architecture constraints)

- Bind HTTP to `127.0.0.1` only.
- Validate `manifest.json` format version and checksums before opening bundles.
- Reject path traversal when unpacking ZIP entries.
- Atomic writes: write to temp, verify, rename.

## Review checklist

Before merging `server/` changes:

- [ ] No SQL or HTTP includes in `domain/`
- [ ] Route handler delegates to repository/domain within ~20 lines of logic
- [ ] New persistence access goes through a repository, not a handler
- [ ] Pixel encode/decode is centralized, not copy-pasted
- [ ] OpenAPI contract updated if API surface changed
- [ ] Migration added if schema changed
- [ ] Hot paths avoid redundant allocations and copies
- [ ] Paths use `std::filesystem` with traversal checks for bundles

## Additional resources

- Architecture overview: [ARCHITECTURE.md](../../../ARCHITECTURE.md)
- Layer examples, anti-patterns, and handler templates: [reference.md](reference.md)
