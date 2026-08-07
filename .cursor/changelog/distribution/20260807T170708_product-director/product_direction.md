# Product Direction — Cross-Platform Installers + Unified Updater

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-07 |
| **Session type** | Product review |
| **Feature area** | distribution |
| **Primary persona** | Riley (hobbyist); Morgan / Alex (workshop facilitators) |
| **Teams convened** | Design (Maya, Leo) + Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/distribution/20260807T170346_product-refinement/loop-backlog.md`, `.cursor/changelog/distribution/20260807T170400_uxui-design-critique/uxui_design_critique.md` |

## Product vision

Pixelanea is a local-first pixel editor — one app, one stack (Tauri shell + C++ server + React web), three platforms. Riley downloads a single obvious installer per OS (`.deb`, Windows setup `.exe`, macOS `.dmg`), paints immediately, and updates from **File → Check for updates** without accounts or cloud dependency. Morgan pre-images lab machines with documented silent installs; Alex gets predictable GitHub Release filenames across Linux, Windows, and macOS. Linux packaging is proven; this release train closes the gap on Windows and macOS **and** extends the existing custom updater so every platform shares the same update dialog, trust copy, and restart flow. Unsigned builds are acceptable for pilot/CI; public workshop push requires signing (Batch 3).

## Chair brief

**Product question:** How should Pixelanea ship macOS DMG + Windows EXE installers that bundle the same stack as Linux, with a coherent cross-platform in-app update story?

**Primary persona:** Riley (frictionless install + safe updates); Morgan / Alex (mass deploy, zero install tickets).

**Success looks like:** Tag `v1.1.0` publishes Linux artifacts (existing) **plus** `pixelanea-1.1.0-windows-x64-setup.exe` and `pixelanea-1.1.0-macos-arm64.dmg`. Fresh Win10 / macOS 12 VMs: double-click install → native shell → `/api/health` OK. In-app update: check → install → restart works on all three OSes with platform-specific errors surfaced clearly. Projects stay local; no re-login.

**Constraints:** Local-first, no accounts; canvas hero (install/update chrome recedes); layer boundaries unchanged; native per-OS CI runners; extend existing `updater.rs` + `UpdateDialog` — no Tauri built-in updater pivot.

**Teams convened:** Design + Strategy

## Synthesis

### Aligned

- **Same stack everywhere** — server + web staged into Tauri bundle resources; extract shared `scripts/stage-desktop-assets.sh` from Linux staging.
- **Windows P0 = NSIS `.exe`** (Tauri bundle); **macOS P0 = DMG** (Tauri bundle); defer MSI, `.pkg`, App Store, snap/flatpak.
- **Portable parallels** — `pixelanea-{version}-windows-x64.zip` and `pixelanea-{version}-macos-{arch}.zip` mirror Linux `tar.gz`.
- **Extend custom `updater.rs`** — GitHub Releases + `main/VERSION`; new `InstallKind` values for Windows/macOS; **not** Tauri updater plugin.
- **Native CI** — `windows-latest`, `macos-14` (arm64), existing `ubuntu-22.04`; no cross-compile.
- **Update UX parity** — one `UpdateDialog` flow (check → install → restart); OS owns installer wizards; Pixelanea owns in-app update UI, trust copy, restart guard.
- **User-initiated updates only** for v1 — no background nag on launch (canvas hero).
- **Asset naming contract** locked before updater extension (see Outcomes table).

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| Batch order: Windows first vs macOS first | Strategy: Windows RICE #1 (~60% workshop); Design: both need updater before dialog is honest | **Batch 1 = Windows installer + CI + asset contract**; **Batch 2 = macOS DMG + cross-platform updater + UX P0s** | Windows is largest uncovered audience; macOS updater semantics (`.app` replace) need more spike — but **do not ship Win/Mac without updater extension in same release train** as public download links |
| Updater before or after installers | Strategy: filenames first, updater can trail one batch; Design: dialog "lies" without backend | **Lock filenames in Batch 1**; **updater + UX P0s ship in Batch 2 before marketing Win/Mac** | Pilot CI can publish unsigned installers; Riley-facing download page waits for coherent update story |
| `system_msi` vs NSIS naming in design recs | Design used MSI in InstallKind example; Strategy: NSIS only P0 | **`WindowsInstaller` / `WindowsPortable`** — not `system_msi` | Matches NSIS `.exe` decision; MSI remains P2 |
| Unsigned P0 vs signing P0 for public | Strategy: unsigned pilots OK; Design: red UX risk for SmartScreen/Gatekeeper | **Unsigned OK for CI/pilot tags**; **signing (Batch 3) gates public workshop marketing** | Honest beta path without blocking engineering; Morgan shouldn't mass-deploy unsigned EXE to students |
| Background update checks | Design: Maya wants optional checks; Leo: chrome noise | **Defer to P2** — v1 stays File → Check for updates only | Canvas hero; revisit after signed Win/Mac ship |
| First-run welcome overlay | Design P1; Strategy silent | **P1** — skippable `WelcomeCard` after install; never block canvas | Matches DESIGN.md installer/first-run tier without re-teaching NSIS wizard |
| `mainCommit` in update copy | Design: jargon for Riley | **Hide behind View → Show technical info** (P1) | Progressive disclosure |
| Prior direction "no auto-update" | Aug 3 doc deferred auto-update | **Clarify:** user-initiated in-app update **is in scope** (Linux already has it); **background/auto channel remains out of scope** | Terminology drift resolved |

### Decisions

**We will**

- Extract `scripts/stage-desktop-assets.sh`; keep `scripts/stage-linux-desktop.sh` as Linux wrapper.
- Add `scripts/stage-windows-desktop.ps1`, `scripts/package-windows.ps1`, `scripts/build-desktop-windows.ps1`, `scripts/test-package-windows.ps1`.
- Add `scripts/stage-macos-desktop.sh`, `scripts/package-dmg.sh`.
- Update `tauri.conf.json`: `nsis` + `dmg` targets (platform-conditional in CI), `bundle.resources` for staged assets, sync version to root `VERSION` (`1.1.0`).
- Extend `paths.rs` for Windows (`Program Files`, portable, `%LOCALAPPDATA%`) and macOS (`.app` bundle, `~/Applications`, `/Applications`).
- Extend `updater.rs` with `WindowsInstaller`, `WindowsPortable`, `MacAppBundle`, `MacPortable`; platform install paths (NSIS `/S`, zip extract+copy, `.app` replace).
- Add `release-windows` and `release-macos` jobs to `.github/workflows/release.yml`.
- UX: trust block in `UpdateDialog`, platform error copy (UAC, Gatekeeper, partial install), **save guard before restart**, determinate download progress (P1).
- Document asset naming, OS floors, unsigned/SmartScreen/Gatekeeper expectations in `docs/user-guide.md` and `DEPENDENCIES.md`.

**We will not (this loop)**

- Ship MSI/WiX, macOS `.pkg`, Mac App Store, snap, flatpak, or CI-published AppImage.
- Adopt Tauri built-in updater plugin / `latest.json` manifest.
- Background update checks or launch-time update modals.
- Cross-compile Windows/macOS from Linux runners.
- Require code signing to merge packaging scripts (signing is Batch 3 gate for public push).

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Extract `scripts/stage-desktop-assets.sh`; refactor Linux staging to use it | eng | strategy B1-01 |
| P0 | `scripts/build-desktop-windows.ps1` — vcpkg `x64-windows-static`, Release `pixelanea-server.exe` | eng | strategy B1-05 |
| P0 | `scripts/stage-windows-desktop.ps1` + `scripts/package-windows.ps1` — Tauri NSIS + portable zip | eng | strategy B1-02–04 |
| P0 | `tauri.conf.json` — `nsis` target, resources, version sync `1.1.0` | eng | strategy B1-03 |
| P0 | `paths.rs` Windows install detection | eng | strategy B1-06 |
| P0 | `release-windows` CI job; upload `pixelanea-{version}-windows-x64-setup.exe` + portable zip | eng | strategy B1-07 |
| P0 | `scripts/test-package-windows.ps1` smoke test (silent install, `/api/health`) | eng | strategy B1-09 |
| P0 | `scripts/stage-macos-desktop.sh` + `scripts/package-dmg.sh` — Tauri DMG | eng | strategy B2-01–03 |
| P0 | `paths.rs` macOS `.app` bundle detection | eng | strategy B2-04 |
| P0 | Extend `updater.rs` — new `InstallKind`s, `resolve_download_url`, `download_and_install` for Win/Mac | eng | strategy B2-05 |
| P0 | `release-macos` CI job; upload `pixelanea-{version}-macos-{arch}.dmg` (+ zip) | eng | strategy B2-06 |
| P0 | `UpdateDialog` platform errors + trust block + restart save guard | ux + eng | design #2–4 |
| P0 | Unit tests for asset URL suffix contract (`updater.rs`) | eng | strategy B2-07 |
| P1 | Determinate download progress event → `Progress` in dialog | eng + ui | design #5 |
| P1 | Hide `mainCommit` unless technical info on | ux | design #6 |
| P1 | Skippable first-run welcome card (`localStorage` flag) | ux + ui | design #7 |
| P1 | Help → About (version, check for updates, user guide link) | ux + eng | design #8 |
| P1 | Docs: asset naming table, OS floors, unsigned build callouts | eng + ux | strategy B1-08 |
| P2 | Windows Authenticode + macOS notarize/staple (Batch 3) | eng + product | strategy B3-01–02 |
| P2 | Background update check / header badge | ux | design unresolved |
| P2 | MSI, macOS `.pkg`, Linux arm64 release upload | eng | strategy B3-04, B3-06 |

### GitHub Release asset contract

| Platform | Install kind | Filename pattern |
|----------|--------------|------------------|
| Linux | SystemDeb | `pixelanea_{version}_{arch}.deb` |
| Linux | UserLocal / Portable | `pixelanea-{version}-linux-{arch}.tar.gz` |
| Windows | Installer | `pixelanea-{version}-windows-x64-setup.exe` |
| Windows | Portable | `pixelanea-{version}-windows-x64.zip` |
| macOS | App bundle (DMG) | `pixelanea-{version}-macos-{arch}.dmg` |
| macOS | Portable | `pixelanea-{version}-macos-{arch}.zip` |

## Recommended next action

**First shippable batch: Windows installer pipeline (Batch 1).** Invoke `skill-implementer` or `AGENT-recursive-implementer` with strategy backlog items B1-01 through B1-09: extract shared staging → `build-desktop-windows.ps1` → `package-windows.ps1` → `release-windows` job → smoke test. Success metric: tag `v1.1.0-rc1` produces existing Linux artifacts **plus** `pixelanea-1.1.0-windows-x64-setup.exe` and portable zip; Win10 VM health check passes. **Do not publish Riley-facing Windows download until Batch 2** completes (`package-dmg.sh`, `updater.rs` extension, `UpdateDialog` P0 UX). Parallel spike: NSIS silent `/S` flags and default install dir (per-user vs Program Files) — blocks updater `WindowsInstaller` path.

## Open questions

- NSIS silent install dir and elevation behavior — resolve in B1-04 spike before `WindowsInstaller` updater lands.
- macOS updater: zip-of-`.app` vs DMG mount for replace — prefer zip for copy reliability (B2-05 spike).
- Single universal macOS DMG vs dual arm64/x64 artifacts — defer to Batch 3 after arm64 green.
- Signing secrets budget/timeline for public workshop push — product decision before Batch 3 kickoff.
