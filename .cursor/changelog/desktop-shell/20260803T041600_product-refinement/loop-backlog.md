# Loop Backlog — Linux Native Desktop Shell

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | desktop-shell |
| **Trigger** | User asked to plan running Pixelanea outside the browser on Linux; Batch 1 distribution (`.deb` + `xdg-open` launcher, commit f159bdb) shipped; product direction previously deferred embedded WebView until post-v1 |
| **Horizon** | Next 2–3 implementation batches (post-v1.0.0 distribution, pre-workshop polish) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | `.cursor/changelog/distribution/20260803T023000_product-refinement/loop-backlog.md` (Batch 1 Linux `.deb` — done; this backlog covers desktop-shell Batch 2+ in the new feature area) |

## Context summary

Pixelanea ships on Linux as `pixelanea-server` + static `web/` with a bash launcher (`scripts/stage-linux-desktop.sh`) that starts the server on `127.0.0.1:8787` and opens the system browser via `xdg-open`. Workshop personas (Riley, Morgan/Alex) get a menu icon, but the editor still runs inside Firefox/Chrome with tabs and browser chrome. `ARCHITECTURE.md` and `DEPENDENCIES.md` already name **Tauri 2.x** as the future desktop shell; no Tauri code exists yet. File dialogs use server-side zenity via OpenAPI; port conflicts use zenity/terminal prompts in the launcher. The user now wants a refinement plan for a **dedicated native window** — not implementation yet.

## Dialogue summary

- **Jordan:** Tauri 2 is the only option aligned with `DEPENDENCIES.md`, small bundle, and "shell spawns server + embeds `apps/web`" — Electron is too heavy; PWA/`--app` still is a browser; raw wry/WebKitGTK is DIY without ecosystem. Spike must validate WebKitGTK availability on Ubuntu 22.04 lab images.
- **Sam:** Riley's win is "feels like an app" — menu icon opens one window, no URL bar, no accidental tab close. That is the Batch 1 bar; internal Rust comfort is not user-visible.
- **Jordan:** Architecture stays: Tauri owns process lifecycle; `pixelanea-server` stays a separate binary with `--web-root`; WebView navigates to `http://127.0.0.1:8787`. No OpenAPI changes for Batch 1. Port policy from `handle_port_in_use` ports to Tauri native dialogs — never silent `fuser -k`.
- **Sam:** Packaging must not fork the workshop story — one primary `.desktop` entry pointing at the shell; keep browser launcher as fallback binary (`pixelanea-browser` or documented env flag) for broken WebKitGTK labs.
- **Jordan:** Extend existing `stage-linux-desktop.sh` / `package-deb.sh` rather than a separate `pixelanea-desktop` package — same install path, add `pixelanea-shell` binary, update `.desktop` `Exec=`. Tauri bundler `.deb` is a Batch 2 CI concern; Batch 1 can ship via extended staging script locally.
- **Sam:** zenity stays for File Open/Save in Batch 1 — it already works through the API and Morgan's prep checklist covers it. Tauri-owned dialogs need contract work; defer to Batch 3.
- **Jordan:** Linux-only for this loop; Windows shell waits on distribution Batch 2 (NSIS). No snap/flatpak, no auto-update, no C++ pixel rendering. CI adds Rust stable + `webkit2gtk` dev packages on `ubuntu-22.04`.
- **Converged:** Batch 1 = Tauri spike ADR + shippable Linux shell MVP (dedicated window, server subprocess, port UX). Batch 2 = `.deb`/release integration + docs. Batch 3 = optional dialog bridge, single-instance polish, arm64 verify.

## Batched tasks

### Batch 1 — Native window MVP (must ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Time-boxed spike (3 days): Tauri 2 vs Electron vs wry vs Chromium `--app`; document WebKitGTK baseline on Ubuntu 22.04 / Debian 12; write ADR under `docs/adr/` recommending Tauri 2 | both | Evidence-backed shell choice; `DEPENDENCIES.md` names Tauri but repo has zero shell code | — |
| B1-02 | Scaffold `apps/desktop/` Tauri 2 project (Rust sidecar pattern): window loads `http://127.0.0.1:{port}/`, dev + release configs, app icon from `brand/` | both | Minimal shell crate; keeps `apps/web` unchanged | B1-01 |
| B1-03 | Server subprocess manager in shell: resolve `pixelanea-server` path (dev repo vs `/usr/share/pixelanea`), spawn with `--host 127.0.0.1 --port {port} --web-root {path}`, poll `/api/health`, kill on window close | backend | Matches `ARCHITECTURE.md` production model; domain/API untouched | B1-02 |
| B1-04 | Port-in-use UX in shell: detect listen on 8787 (or env `PIXELANEA_PORT`); native Tauri dialog — Open existing / pick alternate port / Cancel; port policy mirrors `handle_port_in_use` in `stage-linux-desktop.sh` (no silent kill) | both | Workshop trust requirement from distribution backlog; replaces launcher zenity for shell path | B1-03 |
| B1-05 | Window chrome: fixed title, app icon, minimum size, disable browser navigation; optional `--devtools` flag for dev only | frontend | User-visible "outside browser" outcome — no tabs, no URL bar | B1-02 |
| B1-06 | `scripts/run-desktop-shell.sh` — build server + web if needed, `cargo tauri dev` / local release run; document WebKitGTK system deps in `DEPENDENCIES.md` | backend | Developer loop before packaging | B1-03 |
| B1-07 | Extend `stage-linux-desktop.sh` + `package-deb.sh`: stage `pixelanea-shell` binary beside `pixelanea-server`; `.desktop` `Exec=/usr/bin/pixelanea-shell`; retain `pixelanea` bash launcher as `pixelanea-browser` fallback symlink | backend | Shippable `.deb` with dedicated window without waiting for Tauri bundler CI | B1-03, B1-05 |

### Batch 2 — Release integration & workshop docs (should ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | CI: add Rust toolchain + `libwebkit2gtk-4.1-dev` (or Tauri-documented packages) to `release.yml`; build `pixelanea-shell` on `ubuntu-22.04` amd64; attach to GitHub Release alongside existing `.deb` | backend | Alex/Morgan need tagged artifacts; avoids manual Rust on lab prep | B1-07 |
| B2-02 | `scripts/test-package-linux.sh` extension: after `.deb` install, launch `pixelanea-shell` headless/smoke (or `tauri` integration test) — window process starts, health OK, clean exit | backend | Regression guard for shell + server coupling | B1-07 |
| B2-03 | Update `docs/user-guide.md`, `docs/workshop/teacher-guide.md`: primary path = native window; document WebKitGTK dependency, `pixelanea-browser` fallback, zenity prep unchanged | frontend | Morgan zero-ticket goal; honest failure modes | B1-07 |
| B2-04 | `DEBIAN/control` `Depends`/`Recommends` audit: add WebKitGTK runtime packages Tauri needs on target distros; keep `Recommends: zenity` | backend | `apt install` must pull shell runtime on fresh Ubuntu 22.04 VM | B1-07 |
| B2-05 | arm64 build verify on `ubuntu-22.04-arm` runner (build only; ship if green) | backend | Riley ARM laptops; same staging layout | B2-01 |

### Batch 3 — Polish & deferred (could ship)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Single-instance lock: second menu click focuses existing window instead of second server | both | Prevents duplicate servers on port 8787 in labs | B1-07 |
| B3-02 | Spike Tauri dialog vs zenity for Open/Save: evaluate bypassing OpenAPI file-dialog endpoints vs new optional `desktop` dialog provider; **default: keep zenity** unless spike shows clear win | both | File dialogs work today; contract churn is costly | B2-03 |
| B3-03 | Windows Tauri shell parity spike (defer implementation until distribution Batch 2 NSIS ships) | both | Explicit out-of-scope for Linux loop; capture effort for future backlog | — |
| B3-04 | Deep link / OS file association: open `.pixelanea` from file manager into shell window | both | Nice Riley workflow; needs argv + server import wiring | B3-01 |

**Scope rollup** (count of tasks per batch):

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 3 | 1 | 3 | 7 |
| Batch 2 | 4 | 1 | 0 | 5 |
| Batch 3 | 0 | 0 | 4 | 4 |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 | 400 | 2.5 | 70% | 2.5 | 280 | 2 |
| Batch 2 | 600 | 1.5 | 85% | 1.0 | 765 | 1 |
| Batch 3 | 200 | 0.75 | 60% | 1.5 | 60 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` where `Confidence` is expressed as a decimal (e.g. 70% → 0.7).

**RICE notes:**

- Batch 2 scores highest on paper (release + docs multiply reach), but **cannot start until Batch 1 lands** — execution order is 1 → 2 → 3 regardless of RICE rank.
- Sam would not promote Batch 3 despite polish value: zenity + single-instance are lab nice-to-haves, not blockers for "outside browser."
- Batch 1 confidence is 70% until WebKitGTK availability is confirmed on a fresh Ubuntu 22.04 VM (B1-01 spike).

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 78 | 62 | high impact / medium risk | Time-box spike; keep `pixelanea-browser` fallback; test on stock Ubuntu 22.04 without dev packages |
| Batch 2 | 55 | 38 | measurable UX win / some unknowns | Pin Rust + Tauri versions; extend existing `test-package-linux.sh`; document WebKitGTK in workshop prep |
| Batch 3 | 28 | 48 | nice-to-have / some unknowns | Defer until Batch 2 stable; do not change OpenAPI for dialogs without product call |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │  B1    │
 50 │     │ HI/LR  │ B2
 25 │ LI/LR │        │ B3
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Shell technology:** Tauri 2.x (pending B1-01 spike confirmation); reject Electron (bundle size), PWA/`--app` (still browser), raw wry-only (ecosystem gap).
- **Architecture:** Shell spawns existing `pixelanea-server` binary; WebView loads `http://127.0.0.1:8787`; `apps/web` canvas stays HTML Canvas 2D; no layer-boundary violations.
- **Packaging:** Extend current `pixelanea` `.deb` staging — add `pixelanea-shell`, update `.desktop` `Exec`; keep bash `pixelanea` launcher as `pixelanea-browser` fallback.
- **File dialogs:** Keep server-side zenity via OpenAPI for v1 shell; no contract change in Batch 1–2.
- **Scope cuts:** Linux-only; no snap/flatpak; no auto-update; no Windows shell in this loop; no embedded Chromium redistribution beyond system WebKitGTK.
- **Port policy:** Reuse distribution trust model — detect, prompt, never silently kill foreign processes on 8787.

### Deferred

- Windows / macOS Tauri shells (after distribution Windows NSIS batch).
- Tauri-native file dialogs replacing zenity (Batch 3 spike only).
- snap/flatpak (product direction post-v1).
- Auto-update channel.
- Replacing `pixelanea-server` with in-process Rust HTTP (unnecessary coupling).

### Open questions

- Exact WebKitGTK runtime package names for `Depends` on Debian 12 vs Ubuntu 22.04 — resolve in B1-01 spike.
- Whether Tauri `deb` bundler replaces hand-rolled `package-deb.sh` long-term, or we only use `cargo tauri build` for the shell binary artifact.
- Single-instance vs multi-window for animation preview — default single-instance unless product requests detach.

## Recommended next action

Run **B1-01 spike** (skill-implementer or dedicated spike PR): scaffold a minimal Tauri 2 app that spawns `pixelanea-server` from a dev tree, opens `127.0.0.1:8787` in WebKitGTK on Ubuntu 22.04, and documents system dependencies. Success = ADR merged + `scripts/run-desktop-shell.sh` demonstrable on a clean VM with `apt install` runtime deps only. Backend owns subprocess/port logic; frontend owns window config; packaging (B1-07) follows once the spike is green.
