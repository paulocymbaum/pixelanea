# ADR 0001: Desktop shell with Tauri 2

**Status:** Accepted  
**Date:** 2026-08-03  
**Time-box:** 3-day spike (B1-01)

## Context

Pixelanea ships as a local C++ server (`pixelanea-server`) plus a static React bundle (`apps/web/dist`). The Linux `.deb` launcher today runs the server and opens the default browser via `xdg-open`. Product goal (desktop-shell backlog B1): a **dedicated native window** without browser chrome, while keeping `apps/web` and the API contract unchanged.

Constraints:

- Linux-first (Ubuntu 22.04 / Debian 12 baseline; WebKitGTK).
- Shell only manages process lifecycle + window; no domain or OpenAPI changes.
- Port 8787 (or `PIXELANEA_PORT`) must never be freed with silent `fuser -k`.
- Keep zenity-backed file dialogs on the server for Batch 1.

## Options considered

| Option | Stack | Pros | Cons |
|--------|-------|------|------|
| **Tauri 2** | Rust + system WebView (WebKitGTK on Linux) | Small binary (~5–15 MB); reuses existing HTTP server + web bundle; no embedded Chromium; active 2.x release line; first-class Linux packaging | Requires Rust toolchain for shell builds; WebKitGTK dev/runtime deps; remote URL needs explicit security config |
| **Electron** | Node + bundled Chromium | Mature ecosystem; easy `loadURL` | ~150 MB+ install; duplicates browser engine; heavier memory; conflicts with “lean local-first” positioning |
| **wry (raw)** | Rust WebView wrapper only | Minimal abstraction; same WebKitGTK backend as Tauri | No bundler, updater, or dialog plugins—we would rebuild window/process/dialog wiring Tauri already provides |
| **Chromium `--app`** | `chromium --app=http://127.0.0.1:8787` | Trivial spike | Still a full browser install; inconsistent chrome removal; no process management; poor menu integration; not a distributable product shell |

### WebKitGTK baseline (Ubuntu 22.04 / Debian 12)

Both targets ship **WebKitGTK 4.1** (`libwebkit2gtk-4.1-0`) with GTK 3. Tauri 2 on Linux links against `webkit2gtk-4.1` and `gtk+-3.0`, matching distro packages:

```bash
# Ubuntu 22.04 / Debian 12 runtime
libwebkit2gtk-4.1-0, libgtk-3-0

# Build (dev)
libwebkit2gtk-4.1-dev, libgtk-3-dev, libayatana-appindicator3-dev
```

This is the same engine GNOME Web and many GTK apps use—no separate Chromium download.

## Decision

**Adopt Tauri 2** (`apps/desktop/`) as the Pixelanea desktop shell on Linux.

Architecture:

```text
pixelanea-shell (Tauri)
  ├─ spawn/kill pixelanea-server (--host 127.0.0.1 --port N --web-root …)
  ├─ poll GET /api/health
  ├─ native port-in-use dialog (open existing / alternate port / cancel)
  └─ WebView → http://127.0.0.1:{port}/

apps/web          unchanged (served by pixelanea-server)
server/           unchanged (CLI flags only)
pixelanea-browser bash fallback launcher (xdg-open path)
```

## Rationale

1. **Layer boundaries preserved** — UI stays in `apps/web`; shell is a thin Rust process manager. Matches `pixelanea-core.mdc`.
2. **Reuse** — Existing `--web-root` static hosting and `/api/health` need no API changes.
3. **Size & performance** — WebKitGTK is already on target desktops; Tauri binary is orders of magnitude smaller than Electron.
4. **Product fit** — Native window title/icon, minimum size, and dialogs without shipping a second browser.
5. **Escape hatches** — `pixelanea-browser` keeps the bash+xdg-open path; `--devtools` is dev-only.

## Consequences

### Positive

- Menu icon opens a real app window (B1 success criteria).
- `.deb` can ship `pixelanea-shell` beside `pixelanea-server` with one WebKitGTK `Depends` line.
- Future batches (native file dialogs, single-instance) extend the shell without rewriting the web app.

### Negative / follow-ups

- CI/release pipelines must install WebKitGTK dev packages to build the shell.
- Remote-origin WebView requires explicit CSP / navigation guards (implemented in shell).
- Windows/macOS shells are out of scope for Batch 1; Tauri remains the likely cross-platform path later.

## References

- Backlog: `.cursor/changelog/desktop-shell/20260803T041600_product-refinement/loop-backlog.md` (B1-01 … B1-07)
- Launcher policy: `scripts/stage-linux-desktop.sh` (`handle_port_in_use`)
- [Tauri 2 Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux)
