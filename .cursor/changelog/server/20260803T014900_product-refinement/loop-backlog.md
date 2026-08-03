# Loop Backlog — api_server.cpp Modularization

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Horizon** | 1 sprint (4 incremental PRs) |
| **Trigger** | `api_server.cpp` at ~944 lines; largest C++ file; maintainability blocker |
| **Teams** | Sam (PM), Jordan (Tech Lead) |

---

## Recommended module split

Follow the existing `file_dialog_handlers.hpp/cpp` pattern: **free functions** returning `httplib::Response`, registered from `ApiServer::register_routes`.

### Shared infrastructure (no routes)

| File | Owns | Notes |
|------|------|-------|
| `api_json_serializers.hpp/cpp` | `project_to_json`, `frame_metadata_to_json`, `frame_to_json`, `color_to_json`, `palette_to_json` | Pure domain→JSON; no HTTP |
| `api_request_parsers.hpp/cpp` | `parse_create_request`, `parse_update_request`, `parse_put_palette_request`, `parse_duplicate_frames_request`, `parse_copy_frame_request`, `parse_reorder_frames_request`, `parse_patch_frame_cells_request`, `parse_asset_type_field` | Throws or returns domain structs; mirrors OpenAPI request bodies |
| `api_http_helpers.hpp/cpp` | `respond_error`, `content_type_is_octet_stream`, `accept_prefers_octet_stream`, `set_frame_binary_headers` | Shared by all handlers; uses `http_response.hpp` |

### Handler context (Jordan recommendation)

Introduce `handler_deps.hpp` with a narrow struct passed to every handler:

```cpp
struct HandlerDeps {
  db::ProjectRepository& projects;
  db::FrameRepository& frames;
  db::PaletteRepository& palettes;
  const logging::ScopedLogger& log;
  FileDialogProvider* file_dialog;  // nullable; only dialog route uses it
};
```

### Per-domain route handlers

| File | Functions | Routes covered |
|------|-----------|----------------|
| `health_handlers.hpp/cpp` | `handle_health()` | `GET /api/health` |
| `project_handlers.hpp/cpp` | `handle_create_project`, `handle_open_project`, `handle_get_project`, `handle_update_project`, `handle_close_project`, `handle_save_project` | `/api/projects*` (6 routes) |
| `frame_handlers.hpp/cpp` | `handle_list_frames`, `handle_duplicate_frames`, `handle_copy_frame`, `handle_reorder_frames`, `handle_get_frame`, `handle_put_frame`, `handle_patch_frame_cells` | `/api/projects/{id}/frames*` (7 routes) |
| `palette_handlers.hpp/cpp` | `handle_get_palette`, `handle_put_palette` | palette GET/PUT |
| `import_handlers.hpp/cpp` | `handle_import_pixelate` | `POST .../import/pixelate` |
| `export_handlers.hpp/cpp` | `handle_export_gif` | `POST .../export/gif` |

Dialog stays in `file_dialog_handlers.cpp` (already extracted).

---

## What stays in `api_server.cpp` after full refactor

| Remains | ~lines |
|---------|--------|
| `ApiServer` constructor (member init) | ~10 |
| `register_routes` — path binding only | ~80–120 |
| `http_request_log_.install(server)` | 1 |
| Local `HandlerDeps deps{...}` assembled once | ~5 |

**Target:** `api_server.cpp` ≤150 lines.

---

## Phased delivery batches

### Batch 1 — Shared infrastructure (P0, ship first)

Extract serializers, parsers, HTTP helpers. No handler extraction yet. ~250 lines removed. Mechanical move; zero route behavior change.

### Batch 2 — Project + palette + health handlers (P0)

Add `handler_deps.hpp`, `project_handlers`, `palette_handlers`, `health_handlers`. Thin `register_routes` to delegate.

### Batch 3 — Frame handlers (P1)

Extract `frame_handlers` (7 routes including binary GET/PUT and PATCH cells). `frame_binary_api_test` is regression gate.

### Batch 4 — Import + export handlers (P1)

`import_handlers` (pixelate), `export_handlers` (gif encode). Cross-layer deps isolated.

---

## RICE scoring

| Batch | Score | Priority |
|-------|-------|----------|
| 1 — Shared infra | 9 | **P0** |
| 2 — Project/palette/health | 4.5 | **P0** |
| 3 — Frame handlers | 1.3 | P1 |
| 4 — Import/export | 3 | P1 |

---

## Scope cuts — we will NOT

- Move HTTP logic into `domain/`
- Introduce OpenAPI code generation
- Refactor repositories or add a service layer
- Change route paths, status codes, or JSON field names
- Touch frontend or `contracts/openapi.yaml`

---

## Recommended first implementer action

Invoke `skill-implementer` for **Batch 1 only**: create three shared infra file pairs, update CMake, run `pixelanea_tests`.
