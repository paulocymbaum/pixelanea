# ADR 0002: Desktop file dialogs stay behind OpenAPI

**Status:** Accepted  
**Date:** 2026-08-03  
**Updated:** 2026-09-20  
**Time-box:** Batch 3 spike (B3-02); platform providers 2026-09

## Context

Pixelanea’s **File → Open** and **Save As** flows call the OpenAPI `pickProjectPath` / `openProject` / `saveProject` endpoints. The Tauri shell (`pixelanea-shell`) already uses **tauri-plugin-dialog** for port-in-use prompts.

Product question (B3-02): should editor file pickers move from the C++ server to Tauri native dialogs (shell)?

Constraints:

- `contracts/openapi.yaml` is the API contract; UI must not bypass it.
- Shell loads the web app from `http://127.0.0.1:{port}/` — not as an embedded Tauri frontend bundle.
- Linux workshops still depend on zenity + manual path fallback when zenity is missing.
- Windows and macOS installers must show native pickers without requiring zenity.

## Options considered

| Option | How it works | Pros | Cons |
|--------|----------------|------|------|
| **A. Server `FileDialogProvider` per OS** | Linux zenity; Windows `IFileDialog`; macOS `/usr/bin/osascript` | OpenAPI unchanged; works for `pixelanea-browser` too; OCP via new providers | Three implementations; macOS helper is AppleScript, not in-process Cocoa |
| **B. Tauri shell dialogs** | Shell exposes invoke/command; web calls shell instead of OpenAPI picker | Native dialogs from the window process | Needs a shell API + web branching; **OpenAPI picker endpoints become dead or need parallel paths**; browser launcher loses native pickers |
| **C. Hybrid** | OpenAPI returns `pickerUnavailable`; web asks shell via injected bridge | Graceful degradation | Two picker implementations; contract ambiguity |

### OpenAPI churn (Option B / C)

Moving pickers to the shell would require at least one of:

- New OpenAPI operations (e.g. `shellPickProjectPath`) — **contract change**.
- Or bypassing OpenAPI from the web layer — **violates layer boundaries**.

### Tauri spike findings

- `tauri-plugin-dialog` supports blocking message dialogs (already used for port policy).
- File picker APIs exist in Tauri 2 but are not reachable from the externally loaded React app without an IPC bridge or rebuilding `apps/web` as the Tauri frontend.
- `pixelanea-server` is a **child process** of the shell. In-process Cocoa `NSOpenPanel` from that child is unreliable; osascript matches the existing zenity spawn pattern.

## Decision

Keep file pickers on the **server** behind `POST /api/dialog/pick-project-path`. Do **not** change `contracts/openapi.yaml`.

Platform providers:

| OS | Provider | Mechanism |
|----|----------|-----------|
| Linux | `ZenityFileDialogProvider` | `zenity --file-selection` |
| Windows | `Win32FileDialogProvider` | `IFileOpenDialog` / `IFileSaveDialog` |
| macOS | `OsascriptFileDialogProvider` | `/usr/bin/osascript` `choose file` / `choose file name` |

The shell uses Tauri dialogs **only for shell concerns** (port in use, missing install paths). The zenity-missing warning is **Linux-only**.

## Rationale

1. **Layer boundaries** — picker policy stays behind OpenAPI; web keeps using generated client wrappers.
2. **Installed Mac/Windows** — zenity is not available there; a null provider made Open/Save return 503.
3. **Dual launcher support** — `pixelanea-browser` and headless dev still need server-side pickers.
4. **OCP** — new OS = new `FileDialogProvider`, not handler `if` chains.

## Consequences

### Positive

- Zero OpenAPI churn.
- Linux `.deb` `Recommends: zenity` remains accurate.
- Windows and macOS Open/Save use native OS dialogs.

### Negative / follow-ups

- Two dialog stacks (shell messages vs server pickers) until a future unified design.
- If we later embed the web app as Tauri `frontendDist`, revisit Option B with a single picker path.

## References

- Zenity provider: `server/src/api/zenity_file_dialog_provider.cpp`
- Win32 provider: `server/src/api/win32_file_dialog_provider.cpp`
- macOS provider: `server/src/api/osascript_file_dialog_provider.cpp`
- Shell port dialog: `apps/desktop/src-tauri/src/lib.rs`
