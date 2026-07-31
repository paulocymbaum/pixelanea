# Pixelanea C++ Reference

Extended patterns for `pixelanea-cpp-standards`. Read when implementing new modules.

## Repository pattern (from ARCHITECTURE.md)

Persistence is accessed only through repositories—never from route handlers directly:

```cpp
class ProjectRepository {
public:
    ProjectHandle open(const std::filesystem::path& dbPath);
    void save(ProjectHandle& handle);
    void close(ProjectHandle& handle);
};

class FrameRepository {
public:
    Frame get(ProjectId id, int frameIndex);
    void put(ProjectId id, const Frame& frame);
    void duplicateAll(ProjectId id, int targetCount);
};
```

SQLite implementation lives in `db/`; handlers receive abstract interfaces or concrete repos injected at server startup.

## Thin handler template

```cpp
// api/frame_handlers.cpp — illustrative
HttpResponse put_frame(const Request& req, FrameRepository& frames) {
    auto body = parse_json(req.body());           // api concern
    if (!body) return error_response(400, body.error());

    Frame frame = frame_from_json(*body);         // api ↔ domain mapping
    if (!validate_frame(frame)) return error_response(400, "invalid frame");

  auto err = frames.put(project_id_from(req), frame);  // persistence
    if (err) return error_response(500, err.message());

    return json_response(200, frame_metadata_json(frame));
}
```

## Domain purity example

```cpp
// domain/pixel_grid.cpp — OK
void quantize_to_palette(PixelGrid& grid, const Palette& palette);

// domain/pixel_grid.cpp — FORBIDDEN
void save_frame_to_db(sqlite3* db, const Frame& frame);
```

## Image pipeline order

Always follow ARCHITECTURE data flow:

1. Decode (stb_image)
2. Downscale to `targetWidth` × `targetHeight`
3. Quantize to palette (≤256 colors)
4. Return `PixelGrid` to caller for DB insert

Do not quantize before downscale. Reuse a single scratch buffer across steps when possible.

## Bundle lifecycle

| Action | Implementation notes |
|--------|------------------------|
| Save | Checkpoint WAL → write `project.db` → build manifest + checksums → ZIP atomically |
| Open | Unpack to temp → validate manifest + checksums → migrate → attach DB |
| Import | Validate before copy; reject unknown `formatVersion` when incompatible |

Checksums: SHA-256 per `manifest.json` (OpenSSL or standalone impl per DEPENDENCIES.md).

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| `sqlite3_exec` in `api/` handler | Move to repository in `db/` |
| Duplicate JSON field names vs OpenAPI | Update `contracts/openapi.yaml` and regenerate client |
| Raw `uint8_t*` grid in multiple encodings | Single `PixelBlobCodec` in `db/` or `domain/` |
| Loading entire asset table on every frame GET | Query only `frames` for frame endpoints |
| `std::vector` reallocation per pixel in quantize | Single buffer + index write |
| Exposing server on `0.0.0.0` | Bind `127.0.0.1` only |
| Saving command history to SQLite | Persist grids only; undo is client-side |

## Extension points (preserve interfaces)

| Future feature | Add without breaking layers |
|----------------|----------------------------|
| CLI exporter | Reuse `export/` + repositories |
| GIF/spritesheet export | New encoder in `export/` |
| Cloud sync | New repository backend behind same interfaces |
| Layers | New table + extend `Frame`; domain types first |

## Domain model reference

```text
Project
├── id, name, schemaVersion
├── canvas: { width, height, cellSize }
├── palette: Palette
├── animation: { frameCount: 8|16|32, fps }
├── frames: Frame[]
└── metadata: { author?, tags?, thumbnail? }

Frame
├── index, width, height
└── pixels: compressed blob (palette indices or RGBA)

Palette
├── id, name
└── colors: { slot, hex, name? }[]
```

## Build order (when adding features)

Follow ARCHITECTURE recommended order:

1. `contracts/openapi.yaml`
2. `server/db` — schema, migrations, repositories
3. `server/api` — handlers
4. Domain/image/export as needed
5. Frontend consumes generated client
