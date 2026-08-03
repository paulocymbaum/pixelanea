# ADR 0002: Desktop file dialogs — keep zenity on server

**Status:** Accepted  
**Date:** 2026-08-03  
**Time-box:** Batch 3 spike (B3-02)

## Context

Pixelanea’s **File → Open** and **Save As** flows call the OpenAPI `pickProjectPath` / `openProject` / `saveProject` endpoints. On Linux desktop builds, the C++ server opens native file pickers via **zenity** (`server/src/api/zenity_file_dialog_provider.cpp`). The Tauri shell (`pixelanea-shell`) already uses **tauri-plugin-dialog** for port-in-use prompts.

Product question (B3-02): should editor file pickers move from zenity (server) to Tauri native dialogs (shell)?

Constraints:

- `contracts/openapi.yaml` is the API contract; UI must not bypass it.
- Shell loads the web app from `http://127.0.0.1:{port}/` — not as an embedded Tauri frontend bundle.
- Workshops depend on zenity + manual path fallback when zenity is missing.

## Options considered

| Option | How it works | Pros | Cons |
|--------|----------------|------|------|
| **A. Keep zenity (current)** | Server spawns `zenity --file-selection` / `--file-save` via OpenAPI | Already shipped; works in browser fallback (`pixelanea-browser`); no shell↔web bridge for pickers; OpenAPI unchanged | Requires `zenity` package; GTK dialogs differ slightly from Tauri/WebKit chrome |
| **B. Tauri shell dialogs** | Shell exposes invoke/command; web calls shell instead of OpenAPI picker | Native GTK dialogs from same process as window; consistent with port dialog | Needs new shell API + web detection of shell vs browser; **OpenAPI picker endpoints become dead or need parallel paths**; browser launcher loses native pickers |
| **C. Hybrid** | OpenAPI returns `pickerUnavailable`; web asks shell via injected bridge | Graceful degradation | Two picker implementations; highest maintenance; contract ambiguity |

### OpenAPI churn (Option B / C)

Moving pickers to the shell would require at least one of:

- New OpenAPI operations (e.g. `shellPickProjectPath`) — **contract change**.
- Or bypassing OpenAPI from the web layer — **violates layer boundaries**.

Neither is justified for Batch 3 polish.

### Tauri spike findings

- `tauri-plugin-dialog` supports blocking message dialogs (already used for port policy).
- File picker APIs exist in Tauri 2 (`tauri-plugin-dialog` file pickers) but are **JavaScript/plugin APIs**, not reachable from the externally loaded React app without:
  - injecting a Tauri IPC bridge into the WebView, or
  - rebuilding `apps/web` as the Tauri `frontendDist` with `@tauri-apps/api` imports.
- Server-side zenity already filters `*.pixelanea`, sets titles, and handles save confirmation — feature parity would need reimplementation in Rust.

## Decision

**Keep zenity-backed file dialogs on the server** for Open / Save As. Do **not** change `contracts/openapi.yaml` for Batch 3.

The shell continues to use Tauri dialogs **only for shell concerns** (port in use, missing install paths).

## Rationale

1. **No clear win** — GTK zenity dialogs are already native on Ubuntu/Debian labs; moving pickers does not fix a reported user pain for workshops.
2. **Layer boundaries** — picker policy stays behind OpenAPI; web keeps using generated client wrappers.
3. **Dual launcher support** — `pixelanea-browser` and headless dev still need server-side pickers.
4. **Cost** — shell bridge + web branching is a multi-batch effort, not polish.

## Consequences

### Positive

- Zero OpenAPI churn; Batch 3 ships faster.
- Teacher guide and `.deb` `Recommends: zenity` remain accurate.

### Negative / follow-ups

- Two dialog stacks (shell messages vs zenity pickers) until a future unified design.
- If we later embed the web app as Tauri `frontendDist`, revisit Option B with a single picker path and deprecate zenity.

## References

- Zenity provider: `server/src/api/zenity_file_dialog_provider.cpp`
- Shell port dialog: `apps/desktop/src-tauri/src/lib.rs`
- Backlog: B3-02 in desktop-shell product refinement
