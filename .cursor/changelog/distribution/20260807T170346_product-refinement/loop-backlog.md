# Loop Backlog — Cross-Platform Installers + Unified Updater

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-07 |
| **Feature area** | distribution |
| **Trigger** | Product refinement: ship macOS DMG + Windows EXE with same Tauri shell + C++ server + React web stack as Linux, plus coherent in-app update story |
| **Horizon** | Next 3 implementation batches (v1.1.x release train; VERSION `1.1.0`) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | `.cursor/changelog/distribution/20260803T023000_product-refinement/loop-backlog.md` |

## Context summary

Linux distribution is **shipped**: `scripts/package-deb.sh`, `scripts/package-desktop-linux.sh`, shared `scripts/stage-linux-desktop.sh`, CI `release-linux` in `.github/workflows/release.yml` publishing `pixelanea_{version}_{arch}.deb` and `pixelanea-{version}-linux-{arch}.tar.gz`. Tauri 2 shell at `apps/desktop/src-tauri/` builds `pixelanea-shell`; `tauri.conf.json` bundle targets are `["deb", "appimage"]` only. Custom updater (`updater.rs`) polls GitHub `main/VERSION` and release assets for Linux `.deb` / `.tar.gz` with `InstallKind` `SystemDeb` / `UserLocal` / `Portable` — no Windows or macOS paths. Windows and macOS have **no packaging scripts**; `DEPENDENCIES.md` documents vcpkg triplets only. Prior refinement P0 Windows NSIS remains unimplemented. Goal: three-platform installers with one asset naming scheme and one updater UX (File → Check for updates), local-first, no accounts.

## Dialogue summary

- **Jordan:** Linux pattern is proven — `build-desktop.sh` → `build-desktop-shell.sh` → stage server+web+shell. Windows/macOS should mirror that; use **Tauri 2 bundlers** (`nsis`, `dmg`) for installer shells instead of hand-written WiX/pkg unless we hit a blocker.
- **Sam:** Riley needs double-click install on Win10+ and macOS 12+; Alex needs tagged release with predictable filenames. Linux updater already works — win/mac must not ship as "download manually from GitHub" forever.
- **Jordan:** Extend **custom `updater.rs`** — UI and GitHub Releases flow already wired; Tauri built-in updater needs pubkey manifest + signing pipeline we don't have. Defer Tauri updater plugin.
- **Sam:** Batch 1 must be **user-visible on two non-Linux platforms** minimum; updater can trail installers by one batch if filenames are locked first.
- **Jordan:** **DMG over .pkg** for P0 (drag-install, matches workshop); **NSIS over MSI** (prior spike, lower effort). Unsigned P0 acceptable — document Gatekeeper/SmartScreen; signing Batch 3.
- **Sam:** Coherent update = same dialog, platform picks asset by install kind. Portable folders get zip/tar; system installs get `.exe` silent or `.deb`.
- **Converged:** Extract shared asset staging; platform scripts for bundle; CI native runners; asset naming table; updater Batch 2 after Windows installer + naming land.

## Batched tasks

### Batch 1 — Windows installer + release asset contract (must ship)

**Status:** ✅ **Complete** (2026-08-07)

| ID | Status | Task | Scope | Rationale | Depends on |
|----|--------|------|-------|-----------|------------|
| B1-01 | ✅ Done | Extract `stage_desktop_core_assets()` into `scripts/stage-desktop-assets.sh` (server, web, logo-glyph); keep `stage-linux-desktop.sh` as Linux wrapper (mime, hicolor, bash launchers) | backend | DRY for win/mac/linux staging; same stack in every bundle | — |
| B1-02 | ✅ Done | Add `scripts/stage-windows-desktop.ps1` — copy core assets + `pixelanea-shell.exe` into Tauri resource dir (`apps/desktop/src-tauri/bundle-resources/` or equivalent) | backend | Bundle server+web with shell on Windows | B1-01 |
| B1-03 | ✅ Done | Update `tauri.conf.json` — add `nsis` to `bundle.targets` (platform-conditional in CI); `bundle.resources` for staged server+web; align `version` with root `VERSION` (`1.1.0`) | both | Tauri NSIS produces `pixelanea-{version}-windows-x64-setup.exe` | B1-02 |
| B1-04 | ✅ Done | Add `scripts/package-windows.ps1` — invoke `build-desktop.sh` (via PS wrapper or bash), `build-desktop-shell.sh`, staging, `cargo tauri build --bundles nsis` | backend | Single entry point mirroring `package-deb.sh` | B1-02, B1-03 |
| B1-05 | ✅ Done | Add `scripts/build-desktop-windows.ps1` — vcpkg bootstrap, `x64-windows-static`, Release `pixelanea-server.exe`; reuse `deps-cache.sh` / `assets-cache.sh` patterns | backend | No Windows package without native server binary | — |
| B1-06 | ✅ Done | Extend `apps/desktop/src-tauri/src/paths.rs` — detect Windows install dir (`Program Files\Pixelanea`, portable colocated, `%LOCALAPPDATA%\Pixelanea`) | backend | Updater + shell path resolution on Win | B1-04 |
| B1-07 | ✅ Done | Add `release-windows` job to `.github/workflows/release.yml` — `windows-latest`, native build, upload `dist/pixelanea-{version}-windows-x64-setup.exe` and `dist/pixelanea-{version}-windows-x64.zip` (portable zip from staging) | backend | CI parity with Linux | B1-04, B1-05 |
| B1-08 | ✅ Done | Document asset naming + OS floors in `docs/user-guide.md` and `DEPENDENCIES.md` Windows section | frontend | Alex zero-ticket; SmartScreen/Gatekeeper expectations | B1-04 |
| B1-09 | ✅ Done | Smoke test `scripts/test-package-windows.ps1` — silent install in VM, health check `127.0.0.1:8787/api/health` | backend | Workshop confidence | B1-04 |

### Batch 2 — macOS DMG + cross-platform updater

**Status:** ✅ **Complete** (2026-08-07)

| ID | Status | Task | Scope | Rationale | Depends on |
|----|--------|------|-------|-----------|------------|
| B2-01 | ✅ Done | Add `scripts/stage-macos-desktop.sh` — core assets + shell into Tauri bundle resources; `.app` layout under `Contents/Resources/pixelanea/` | backend | Same stack as Linux/Windows | B1-01 |
| B2-02 | ✅ Done | Update `tauri.conf.json` — `dmg` target; macOS `bundle.resources`; optional `minimumSystemVersion` `12.0` | both | Tauri DMG drag-to-Applications flow | B2-01 |
| B2-03 | ✅ Done | Add `scripts/package-dmg.sh` — `build-desktop.sh`, `build-desktop-shell.sh`, stage, `cargo tauri build --bundles dmg` on `macos-14` (arm64) and/or `macos-13` (x64) | backend | P0 macOS deliverable | B2-01, B2-02 |
| B2-04 | ✅ Done | Extend `paths.rs` — macOS `.app` bundle paths (`Contents/Resources/pixelanea`, `~/Applications`, `/Applications`) | backend | Install kind detection | B2-03 |
| B2-05 | ✅ Done | Extend `updater.rs` — new `InstallKind` values: `WindowsInstaller`, `WindowsPortable`, `MacAppBundle`, `MacPortable`; `resolve_download_url()` suffixes per platform/arch; `download_and_install()` for `.exe` silent (`/S`), zip extract+copy, DMG mount+copy `.app` | both | Coherent in-app update across OSes | B1-06, B2-04, B1-07, B2-03 |
| B2-06 | ✅ Done | Add `release-macos` job(s) in `release.yml` — `macos-14` arm64 DMG; optional `macos-13` x64; upload `pixelanea-{version}-macos-{arch}.dmg` | backend | Publish path | B2-03 |
| B2-07 | ✅ Done | Unit tests in `updater.rs` for new install kinds + URL suffix matching; extend `test-package-linux.sh` pattern for asset name contract | backend | Prevent release asset mismatch | B2-05 |
| B2-08 | ✅ Done | Update `apps/web` update copy if install-kind-specific messages needed (e.g. admin prompt on Windows) | frontend | Riley understands restart/UAC | B2-05 |

### Batch 3 — Signing, notarization, polish (could)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | Windows Authenticode signing in CI (`WIN_CERT` secret); NSIS `/D` signed stub | backend | SmartScreen mitigation | B1-07 |
| B3-02 | Apple Developer ID sign + notarize DMG (`APPLE_CERT`, `notarytool`); staple | backend | Gatekeeper default-open | B2-06 |
| B3-03 | macOS universal binary or explicit arm64+x64 dual DMGs in release notes | backend | Apple Silicon + Intel labs | B2-06 |
| B3-04 | Defer **MSI (WiX)** and **macOS .pkg** — document as P2 for IT/GPO | frontend | Enterprise later | — |
| B3-05 | `THIRD_PARTY_NOTICES.md` in all platform bundles | both | License compliance | B1-07, B2-06 |
| B3-06 | Optional Linux arm64 release upload (currently verify-only job) | backend | Parity with amd64 releases | — |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 7 | 1 | 1 | 9 |
| Batch 2 | 5 | 1 | 1 | 7 |
| Batch 3 | 4 | 1 | 1 | 6 |

## Packaging format decisions

### Linux (shipped — maintain)

| Format | Verdict | Rationale |
|--------|---------|-----------|
| **`.deb` (amd64/arm64)** | **Shipped P0** | `scripts/package-deb.sh`; system install `/usr/share/pixelanea`; updater `SystemDeb` + `pkexec dpkg` |
| **`tar.gz` portable** | **Shipped P0 parallel** | `pixelanea-{version}-linux-{arch}.tar.gz`; updater `UserLocal`/`Portable` |
| **Tauri `appimage`** | **Defer** | Listed in `tauri.conf.json` but not CI-published; AppImage != workshop `.deb` path |

### Windows

| Format | Verdict | Rationale |
|--------|---------|-----------|
| **NSIS `.exe` (Tauri bundle)** | **P0 Batch 1** | Headless CI via `cargo tauri build --bundles nsis`; optional install dir; silent `/S` for updater; matches "single downloadable .exe" from prior refinement |
| **ZIP portable** | **P0 parallel** | `pixelanea-{version}-windows-x64.zip` — same layout as Linux tar.gz; updater `WindowsPortable` |
| **MSI (WiX)** | **P2 defer** | Upgrade tables, GPO expectations, signing — IT admin persona, not workshop v1 |
| **Inno Setup** | **P2 alt** | Only if NSIS/Tauri blocker in spike |

**OS floor:** Windows 10 x64+; static `x64-windows-static` triplet — no VC++ redist step.

### macOS

| Format | Verdict | Rationale |
|--------|---------|-----------|
| **DMG (Tauri bundle)** | **P0 Batch 2** | Standard direct-download UX; drag `Pixelanea.app` to Applications; Tauri 2 native target |
| **`.app` zip** | **P1 parallel** | `pixelanea-{version}-macos-{arch}.zip` for portable/updater copy-without-DMG |
| **`.pkg` (Installer.app)** | **P2 defer** | Better for managed labs later; requires productbuild + signing; not needed for Riley drag-install |
| **Mac App Store** | **Out of scope** | Sandboxing breaks local-first file model |

**OS floor:** macOS 12+ (Monterey); WebKit in Tauri shell.

## Script naming and placement

| Script | Role | Relationship |
|--------|------|--------------|
| `scripts/stage-desktop-assets.sh` | **New** — shared `pixelanea-server`, `web/`, `logo-glyph.svg` | Extracted from `stage_linux_desktop_assets()` core |
| `scripts/stage-linux-desktop.sh` | Linux-only: hicolor icons, MIME, bash launchers, `stage_linux_desktop_shell_binary` | Sources core staging; unchanged call sites in `package-deb.sh`, `package-desktop-linux.sh` |
| `scripts/stage-windows-desktop.ps1` | **New** — core + shell.exe into Tauri resource tree | Called by `package-windows.ps1` |
| `scripts/stage-macos-desktop.sh` | **New** — core + shell into bundle resources | Called by `package-dmg.sh` |
| `scripts/package-deb.sh` | Linux system `.deb` | **Exists** — no rename |
| `scripts/package-desktop-linux.sh` | Linux portable `tar.gz` | **Exists** |
| `scripts/package-windows.ps1` | **New** — Windows NSIS + portable zip | Mirrors `package-deb.sh` orchestration |
| `scripts/package-dmg.sh` | **New** — macOS DMG | Mirrors `package-deb.sh` orchestration |
| `scripts/build-desktop-windows.ps1` | **New** — vcpkg + server Release on Windows | Twin of `build-desktop.sh` for MSVC |
| `scripts/build-desktop-shell.sh` | Tauri release build | **Exists** — shared all platforms |
| `scripts/build-desktop.sh` | Server + web Release | **Exists** — shared (bash; Windows PS calls it or duplicates cmake step) |

**No single `package-all.sh` P0** — CI jobs call platform scripts; avoids cross-compile complexity.

## CI / release workflow

| Topic | Decision |
|-------|----------|
| **Trigger** | `push: tags: ['v*']` — **exists** in `release.yml` |
| **Linux** | `ubuntu-22.04` — **exists** (`release-linux`); glibc 2.35 baseline |
| **Linux arm64** | `ubuntu-22.04-arm` — verify today; promote to release upload in B3-06 |
| **Windows** | **New** `release-windows` on `windows-latest`; **native MSVC** — no Linux cross-compile |
| **macOS** | **New** `release-macos-arm64` on `macos-14`; optional `release-macos-x64` on `macos-13` |
| **Build type** | Release via existing cache keys (`deps-hash.py`, `assets-hash.py`) |
| **Tauri CLI** | `TAURI_CLI_VERSION: "2.0.0"` — match `DEPENDENCIES.md` |
| **Cross-compile** | **Reject** for server and Tauri — each OS job builds natively |

### Artifact naming convention (GitHub Release)

| Platform | Install kind | Filename pattern | Example (`1.1.0`) |
|----------|--------------|------------------|-------------------|
| Linux | SystemDeb | `pixelanea_{version}_{arch}.deb` | `pixelanea_1.1.0_amd64.deb` |
| Linux | UserLocal / Portable | `pixelanea-{version}-linux-{arch}.tar.gz` | `pixelanea-1.1.0-linux-amd64.tar.gz` |
| Windows | Installer | `pixelanea-{version}-windows-x64-setup.exe` | `pixelanea-1.1.0-windows-x64-setup.exe` |
| Windows | Portable | `pixelanea-{version}-windows-x64.zip` | `pixelanea-1.1.0-windows-x64.zip` |
| macOS | App bundle (DMG) | `pixelanea-{version}-macos-{arch}.dmg` | `pixelanea-1.1.0-macos-arm64.dmg` |
| macOS | Portable zip | `pixelanea-{version}-macos-{arch}.zip` | `pixelanea-1.1.0-macos-arm64.zip` |

`arch`: `amd64` / `arm64` on Linux; `x64` on Windows; `arm64` / `x64` on macOS. Updater `resolve_download_url()` must match these suffixes exactly.

## Updater architecture

| Topic | Decision |
|-------|----------|
| **Approach** | **Extend custom `updater.rs`** — already integrated in `lib.rs` + `UpdateDialog` UI; GitHub Releases + `main/VERSION` matches local-first |
| **Tauri built-in updater** | **Defer** — requires embedded pubkey, `latest.json` manifest, and aligned signing; duplicates GitHub flow |
| **Version source** | Compare app version to `raw.githubusercontent.com/.../main/VERSION`; download from `releases/tags/v{version}` assets |
| **New install kinds** | `WindowsInstaller`, `WindowsPortable`, `MacAppBundle`, `MacPortable` (extend existing enum) |
| **Windows install** | `WindowsInstaller`: download `-setup.exe`, run `setup.exe /S` (verify NSIS silent flags in spike); `WindowsPortable`: zip extract + `copy_release_files` |
| **macOS install** | `MacAppBundle`: download zip or DMG — prefer **zip of `.app`** for copy without admin; DMG mount fallback; replace `Pixelanea.app` in install location |
| **Linux** | **No change** — `.deb` / `.tar.gz` paths remain |
| **Failure UX** | Return actionable errors (UAC denied, Gatekeeper blocked) — surface in `UpdateDialog` |

**GitHub release asset strategy:** One tagged release uploads **all platform artifacts** from matrix jobs; updater selects by `InstallKind` + `current_arch_label()` (extend for `x64`/`arm64` on Win/Mac).

## Feasibility risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Windows code signing / SmartScreen** | High trust impact, medium tech | Unsigned P0 + doc warning; B3-01 Authenticode |
| **macOS notarization / Gatekeeper** | High on macOS 12+ | Unsigned P0 for pilots; B3-02 notarize before public push |
| **UAC on Windows updater** | Medium | Silent NSIS to user-writable dir for portable; installer path may need elevation — detect and prompt |
| **Antivirus false positives** | Medium | Static binary + NSIS packer triggers heuristics; signing reduces; publish checksums in release notes |
| **VERSION drift** | Medium | `tauri.conf.json` `1.0.0` vs root `VERSION` `1.1.0` — B1-03 sync + `verify-version.sh` |
| **vcpkg first Windows green build** | Medium | B1-05 spike; cache vcpkg on `windows-latest` |
| **macOS dual arch** | Medium | Two runners or universal binary spike in B3-03 |
| **Tauri resource size** | Low | Server+web ~tens of MB; acceptable for DMG/NSIS |

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 — Windows NSIS + asset contract | 1500 | 2.5 | 75% | 2.5 | 1125 | 1 |
| Batch 2 — macOS DMG + updater extension | 900 | 2.0 | 65% | 2.5 | 468 | 2 |
| Batch 3 — Signing + notarization + polish | 2400 | 1.0 | 70% | 1.5 | 1120 | 3 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` — Confidence as decimal.

**RICE notes:**

- Batch 1 ranks first: largest uncovered audience (~60% workshop downloads assumed Windows), Linux path already proves staging model, confidence highest.
- Batch 2 lower confidence due to notarization unknowns and `.app` replace semantics — Sam still wants Batch 2 before Batch 3 because **unsigned macOS DMG is shippable for pilots** same as unsigned Windows.
- Batch 3 similar RICE to Batch 1 but **depends on artifacts existing** — strategic trust layer, not new capability.

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 78 | 55 | high impact / medium risk | Native CI job; vcpkg cache; smoke test VM; asset naming locked before updater |
| Batch 2 | 72 | 68 | high impact / medium-high risk | Zip-based update path; defer notarization; unit tests on URL suffixes |
| Batch 3 | 45 | 82 | low impact / high risk | Optional secrets; pilot without signing first; staged rollout |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │ B1 B2  │
 50 │ B3  │        │
 25 │     │        │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **DMG** (not `.pkg`) for macOS P0; **NSIS** (not MSI) for Windows P0.
- **Tauri bundle** for NSIS/DMG shells; **custom staging scripts** for server+web (same as Linux).
- **Extend `updater.rs`**, not Tauri updater plugin.
- **Native per-OS CI runners** — no MSVC/macOS cross-compile from Linux.
- **Asset naming table** above is contract for releases and updater.
- Batch 1 shippable without Batch 2; Batch 2 adds macOS + cross-platform updater.

### Deferred

- MSI / WiX, macOS `.pkg`, snap/flatpak, AppImage CI publish.
- Tauri built-in updater with signature manifest.
- Mac App Store.
- Code signing / notarization until Batch 3.

### Open questions

- NSIS silent install flags and default install dir — spike in B1-04 (per-user vs Program Files).
- macOS updater: zip-only vs DMG mount — prefer zip for copy reliability (decide in B2-05 spike).
- Single macOS universal DMG vs arm64+x64 dual artifacts — defer to B3-03 after arm64 green.
- Windows `Win32FileDialogProvider` — not blocking installers; remains separate editor backlog item.

## Recommended next action

**Implement Batch 1 (Windows)** first: `build-desktop-windows.ps1` → `stage-desktop-assets.sh` extraction → `stage-windows-desktop.ps1` → `package-windows.ps1` → `release-windows` job. Sync `tauri.conf.json` version to `1.1.0` and add `nsis` target. Lock release filenames before touching `updater.rs`. Success: tag `v1.1.0` produces Linux artifacts (existing) **plus** `pixelanea-1.1.0-windows-x64-setup.exe` and portable zip; Win10 VM double-click opens native shell, `/api/health` OK. **Owner:** backend/platform scripts + CI; frontend docs only. Batch 2 follows with `package-dmg.sh` and `updater.rs` platform extension for coherent "Check for updates" on all three OSes.
