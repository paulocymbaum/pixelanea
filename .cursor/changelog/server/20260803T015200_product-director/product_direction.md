# Product Direction — api_server.cpp Modularization

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Session type** | Strategy |
| **Feature area** | `server` |
| **Primary persona** | Internal engineering (maintainers shipping local-first API) |
| **Teams convened** | Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/server/20260803T014900_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea's backend promise is a stable, local-first HTTP API that the React editor trusts without surprise. `api_server.cpp` has grown into a monolith that slows every API touch — frame binary negotiation, import pixelate, project lifecycle — even though the product surface hasn't changed. This refactor restores **layer clarity** (routing vs serialization vs handlers) so engineers can ship API fixes in small, reviewable batches without risking OpenAPI contract drift or the existing integration tests. No user-facing feature ships here; the outcome is **maintainability velocity** for everything that does.

## Chair brief — api_server modularization

**Product question:** How do we split `server/src/api/api_server.cpp` (~944 lines) into maintainable modules without breaking the API contract or tests?

**Primary persona:** Engineering maintainers; indirect beneficiary is Riley (stable editor experience).

**Success looks like:** `api_server.cpp` ≤150 lines (constructor + route wiring only); domain handlers follow `file_dialog_handlers` pattern; all `pixelanea_tests` green after each batch; zero OpenAPI changes.

**Constraints:** local-first, ARCHITECTURE.md layer boundaries, OpenAPI as contract source of truth, incremental shippable PRs.

**Teams convened:** Strategy only (no UX implications).

## Synthesis

### Aligned

- **Follow `file_dialog_handlers` pattern** — free `handle_*` functions returning `httplib::Response`; `register_routes` stays a thin binder.
- **Extract shared infra before handlers** — serializers, parsers, and HTTP helpers are mechanical moves that remove ~250 lines and reduce merge conflict risk.
- **Introduce `HandlerDeps`** — single struct with repo refs + logger (+ optional `file_dialog`) passed to handlers.
- **Batch by risk** — project/palette before frames (binary negotiation); import/export last (cross-layer `image::` / `gif::`).
- **CMake is part of every batch** — new `.cpp` files in both `pixelanea-server` and `pixelanea_tests` source lists.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| One big PR vs many small PRs | Sam/Jordan | **4 batches, 4 PRs** | Each PR independently revertible; Batch 1 highest confidence |
| `HandlerDeps` vs individual params | Jordan vs precedent | **`HandlerDeps` for new handlers** | 6+ handlers justify struct; dialog stays as-is |
| Single `api_json` vs split serializers/parsers | Sam vs Jordan | **Two files** | Different change rates (OpenAPI vs stable projection) |
| Handler unit tests | Jordan | **Integration only this loop** | `frame_binary_api_test` is sufficient gate |

### Decisions

**We will**

- Split into 10 new translation units (+ `handler_deps.hpp`) per module table below
- Ship Batch 1 (shared infra) as the **first PR**
- Keep `ApiServer` as the sole route registrar
- Preserve all route paths, status codes, error events, and JSON shapes verbatim
- Run `pixelanea_tests` after every batch

**We will not (this loop)**

- Change `contracts/openapi.yaml` or frontend client
- Move business logic into `domain/` or introduce a service layer
- Refactor repositories, migrations, or export/image pipelines
- Add OpenAPI code generation

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Extract `api_json_serializers`, `api_request_parsers`, `api_http_helpers` (Batch 1) | eng | strategy |
| P0 | Extract `health_handlers`, `project_handlers`, `palette_handlers` + `handler_deps.hpp` (Batch 2) | eng | strategy |
| P1 | Extract `frame_handlers` with binary content negotiation preserved (Batch 3) | eng | strategy |
| P1 | Extract `import_handlers`, `export_handlers` (Batch 4) | eng | strategy |
| P1 | `api_server.cpp` ≤150 lines post-Batch 4 | eng | strategy |

### Target file layout (post-refactor)

```text
server/src/api/
  api_server.hpp/cpp          # constructor + register_routes wiring only
  handler_deps.hpp            # HandlerDeps struct
  api_json_serializers.hpp/cpp
  api_request_parsers.hpp/cpp
  api_http_helpers.hpp/cpp
  health_handlers.hpp/cpp
  project_handlers.hpp/cpp
  frame_handlers.hpp/cpp
  palette_handlers.hpp/cpp
  import_handlers.hpp/cpp
  export_handlers.hpp/cpp
  file_dialog_handlers.hpp/cpp  # (existing)
  http_response.hpp             # (existing)
  base64.hpp/cpp                # (existing)
```

### ARCHITECTURE.md alignment

| Layer | Placement | Rule |
|-------|-----------|------|
| `api/` | All new files | HTTP, JSON, error responses, route handlers |
| `domain/` | Unchanged | Handlers call domain types only |
| `db/` | Unchanged | Handlers use repos — never SQL |
| `image/` | `import_handlers` only | No HTTP in image layer |
| `export/` | `export_handlers` only | GIF encode stays in export layer |

### Risk notes

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenAPI drift | High if behavior changes | Refactor-only; no contract edits |
| `frame_binary_api_test` regression | Medium | Run after Batch 3 |
| CMake omission | Medium | Update server + test source lists |
| Merge conflicts | Medium | Batch 1 first to shrink conflict surface |

## Recommended next action

Invoke **`skill-implementer`** for **Batch 1** (shared infrastructure extraction). Success metric: `api_server.cpp` drops by ~250 lines, all tests green, single mechanical PR. After merge, proceed to Batch 2. Do not start Batch 3 until Batch 2 tests pass.

## Open questions

- Should `respond_error` live in `http_response.hpp` vs `api_http_helpers.cpp`? Defer to implementer — prefer `.cpp`.
- Unit tests for `api_request_parsers` against OpenAPI examples? Defer post-refactor.
