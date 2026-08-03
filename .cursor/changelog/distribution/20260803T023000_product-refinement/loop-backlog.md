# Loop Backlog — Quick Installers (Debian Linux + Windows)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | distribution |
| **Trigger** | Taylor (Product Director) strategy request: workshop-ready `.deb` / Windows `.exe` installers without a full release-engineering platform |
| **Horizon** | Next 2–3 implementation batches (v1.0.0 workshop launch) |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Pixelanea already ships a **partial Linux desktop story**: `scripts/build-desktop.sh` produces a Release `pixelanea-server` + static `web/` bundle; `scripts/package-desktop-linux.sh` emits a portable `dist/pixelanea-{version}-linux-{arch}.tar.gz` with embedded `install.sh` (user-level `~/.local` + `.desktop` entry). Windows is documented in `DEPENDENCIES.md` (`x64-windows-static` triplet) but has **no build or packaging scripts**. CI (`.github/workflows/build.yml`) runs Ubuntu Debug only — no release artifacts. Workshop `teacher-guide.md` still points facilitators at `./scripts/dev.sh`, not installers. Primary personas: **Riley** (frictionless install) and **Alex/Morgan workshop slice** (zero install support tickets, pre-install on lab machines). Goal: maintainable in-repo scripts, not enterprise release infrastructure.

## Feasibility assessment

| Area | Status | Effort | Risk |
|------|--------|--------|------|
| Linux tar.gz packaging | **Done** (`package-desktop-linux.sh`) | — | Low |
| Linux `.deb` | **Feasible** — reuse existing staging layout + `dpkg-deb`; no new runtime deps if binary stays mostly self-contained via vcpkg | ~3–5 person-days | Low–medium (glibc baseline, menu integration) |
| Linux snap/flatpak | **Defer** — sandbox + portal file dialogs + Flathub/snapcraft maintenance ≠ "quick" | 2–3 weeks each | High (file picker regression) |
| Windows static build | **Feasible** — `#if defined(_WIN32)` exists; vcpkg `x64-windows-static` documented | ~5–8 person-days first green build | Medium (vcpkg cache, toolchain) |
| Windows NSIS installer | **Feasible** — scriptable headless (`makensis`); bundles server + `web/` + launcher `.exe` | ~3–5 person-days after build works | Low–medium |
| Windows MSI (WiX) | **Defer** — XML boilerplate, upgrade tables, signing expectations | 1–2 weeks | Medium–high |
| Native Windows file dialogs | **Gap** — only `ZenityFileDialogProvider` wired in `main.cpp`; path fallback works but hurts workshop UX | ~3–5 person-days (COM `IFileDialog`) | Medium |
| Win7 support with VS 2022 | **Constrained** — VS 2022 dropped official Win7 targeting; React 19/Vite 6 bundle assumes modern browser | Spike needed | High if Win7 is hard P0 |
| CI release workflow | **Feasible** — extend existing cache scripts; Linux native + Windows `windows-latest` job | ~2–4 person-days | Low–medium |
| Code signing | **Out of scope P0** — document SmartScreen warning; P1 optional cert | — | — |

**Architecture check:** Packaging stays outside `domain/` and `server/api/` handlers — launcher scripts + installer metadata only. No OpenAPI or migration changes required.

## Dialogue summary

- **Jordan:** Linux `.deb` via `dpkg-deb` is the lowest-maintenance workshop path; keep existing tar.gz as portable fallback. Snap/flatpak are a platform product, not a quick installer.
- **Sam:** Facilitators need `sudo apt install ./pixelanea_*.deb` on lab images and a Start Menu entry — tar.gz is fine for Riley power-users but not Alex's zero-ticket bar.
- **Jordan:** Windows P0 = NSIS single `.exe` (portable + optional install); MSI/WiX is release-engineering cosplay for v1.
- **Sam:** Agreed, but Win7 is a trap — workshop labs may still run it; we need an explicit browser + OS floor in docs, not silent breakage.
- **Jordan:** Build Windows on `windows-latest` natively; cross-compile MSVC from Linux is not worth it. Linux release job on `ubuntu-22.04` for glibc 2.35 baseline (Debian 12 / Ubuntu 22.04+).
- **Sam:** Batch 1 must be user-visible: Linux `.deb` amd64 + updated workshop guide. Batch 2 = Windows installer. Batch 3 = arm64, signing, polish.
- **Jordan:** zenity stays optional (`Recommends:` in `.deb`); Windows file dialog provider moves to Batch 2 alongside NSIS — path fallback ships first if needed.
- **Converged:** P0 formats = `.deb` (Linux) + NSIS `.exe` (Windows); tar.gz remains parallel artifact; Win10+ hard floor with Win7 documented as best-effort.

## Packaging format decisions (Taylor)

### 1. Linux format — **P0: `.deb` (amd64); parallel: existing tar.gz**

| Format | Verdict | Rationale |
|--------|---------|-----------|
| **`.deb` (`dpkg-deb`)** | **P0** | Debian/Ubuntu workshop labs; `apt install ./pkg.deb`; `.desktop` + `/usr/share/pixelanea`; uninstall via `apt remove`. Scriptable in CI without Ruby/fpm. |
| **tar.gz** (existing) | **P0 parallel** | Already in `package-desktop-linux.sh`; portable USB / no-root; zero new tooling. |
| **snap** | P2 defer | Snapcraft YAML + confinement; `/api` file dialogs need portals; slow cold start. |
| **flatpak** | P2 defer | Flathub process + runtime updates; same portal friction. |

**Tool:** `dpkg-deb` (coreutils, no `fpm` gem). Script: `scripts/package-deb.sh` calling shared staging from `scripts/package-desktop-linux.sh` (extract common `stage-linux-desktop.sh`).

### 2. Windows format — **P0: NSIS `.exe`**

| Format | Verdict | Rationale |
|--------|---------|-----------|
| **NSIS** | **P0** | Headless `makensis scripts/package-windows.nsi`; single downloadable `.exe`; portable mode + optional install dir; minimal deps; fits "in-repo scripts" mandate. |
| **Inno Setup** | P1 alt | Comparable UX; `ISCC` also scriptable — switch only if NSIS blocker found in spike. |
| **MSI (WiX)** | P2 defer | Upgrade tables, ARP, signing expectations; better for IT GPO later, not workshop v1. |

**Scripts to add:** `scripts/build-desktop-windows.ps1`, `scripts/package-windows.nsi`, `scripts/package-desktop-windows.ps1` (or `.sh` wrapper invoking NSIS on CI).

### 3. Windows 7 implications

| Topic | Recommendation |
|-------|----------------|
| **OS floor** | **P0: Windows 10 x64**; Win7 documented as best-effort only |
| **Toolchain** | VS 2022 + `x64-windows-static` per `DEPENDENCIES.md`; do not pin VS 2019 unless Taylor mandates Win7 |
| **MSVC runtime** | Static triplet → no VC++ redistributable install step |
| **Browser** | App opens default browser to `127.0.0.1:8787`; Win7 lacks Edge Chromium — document **Firefox ESR** or last supported Chrome; IE11 unsupported (React 19 / modern JS) |
| **File dialogs** | No native Win provider yet — path fallback works; `Win32FileDialogProvider` (COM) is Batch 2 scope |
| **Launcher** | `pixelanea.cmd` or small `.exe` stub: start server, poll `/api/health`, `start http://127.0.0.1:8787` |

### 4. Dependencies

| Dependency | Decision |
|------------|----------|
| **zenity** | **Optional** — `Recommends: zenity` in `.deb`; portable README + workshop prep checklist already cover `sudo apt install zenity`. Do not bundle. |
| **glibc baseline** | Build release on **`ubuntu-22.04`** → glibc **2.35** (covers Debian 12, Ubuntu 22.04+). Document floor in `README.txt` / user guide. Older distros: use tar.gz on matching arch or build from source. |
| **curl** | Launcher health-check only; graceful sleep fallback already in launcher scripts |

## P0 / P1 outcomes

| ID | Outcome | Priority | Persona | Acceptance |
|----|---------|----------|---------|------------|
| O-P0-01 | `pixelanea_{version}_amd64.deb` installs via `apt`, menu entry, `pixelanea` in PATH | P0 | Alex, Riley | Fresh Ubuntu 22.04 VM: install → app opens → health OK |
| O-P0-02 | Existing `pixelanea-{version}-linux-amd64.tar.gz` still published alongside `.deb` | P0 | Riley | USB portable run without root |
| O-P0-03 | `pixelanea-{version}-win64-setup.exe` (NSIS) installs or runs portable | P0 | Riley, Alex | Win10 VM: double-click → browser → draw + save (path dialog OK) |
| O-P0-04 | GitHub Release workflow attaches Linux + Windows artifacts on version tag | P0 | Alex | Tag `v1.0.0` → 3 assets in Releases |
| O-P0-05 | Workshop docs reference installers, not `dev.sh` | P0 | Morgan | `teacher-guide.md` lab prep ≤5 steps |
| O-P1-01 | `pixelanea_{version}_arm64.deb` + tar.gz | P1 | Riley (ARM laptops) | Build on `ubuntu-22.04-arm` runner |
| O-P1-02 | Native Windows `IFileDialog` provider | P1 | Alex | File → Open/Save uses OS dialog on Win10+ |
| O-P1-03 | Code signing (Windows Authenticode + optional Linux GPG apt repo) | P1 | Riley | Reduced SmartScreen warnings |
| O-P1-04 | Win7 best-effort matrix doc + browser pin list | P1 | Alex | Explicit supported/unsupported table |
| O-P2-01 | MSI / enterprise deployment | P2 | IT admins | — |
| O-P2-02 | snap / flatpak | P2 | — | — |
| O-P2-03 | Auto-update channel | P2 | Riley | — |

## Batched tasks

### Batch 1 — Linux workshop install (must ship)

**Status:** 🔄 **In progress** (2026-08-03)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Extract shared Linux staging helper `scripts/stage-linux-desktop.sh` from `package-desktop-linux.sh` | backend | DRY between tar.gz and `.deb` | — |
| B1-02 | Add `scripts/package-deb.sh` — `DEBIAN/control`, `postinst`, `prerm`; install to `/opt/pixelanea` or `/usr/lib/pixelanea` + `/usr/bin/pixelanea` symlink; `.desktop` in `/usr/share/applications` | backend | P0 `.deb` deliverable | B1-01 |
| B1-03 | Add `debian/` metadata templates or inline generation in `package-deb.sh` (`Depends: libc6 (>= 2.35)`, `Recommends: zenity`) | backend | apt integration | B1-02 |
| B1-04 | Smoke test script `scripts/test-package-linux.sh` — install `.deb` in Docker `ubuntu:22.04`, curl health | backend | Workshop confidence | B1-02 |
| B1-05 | Update `docs/workshop/teacher-guide.md` + `docs/user-guide.md` — `.deb` + tar.gz paths; zenity prep | frontend | Morgan zero-ticket goal | B1-02 |
| B1-06 | Add `.github/workflows/release.yml` — on tag `v*`: Release build, `package-deb.sh`, `package-desktop-linux.sh`, upload artifacts | backend | Publish path for Alex | B1-02 |

### Batch 2 — Windows installer

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | Add `scripts/build-desktop-windows.ps1` — vcpkg bootstrap, `x64-windows-static`, Release, `pnpm` web build | backend | No Windows package without binary | — |
| B2-02 | Add `scripts/pixelanea-launch.ps1` (or `.cmd`) — port cleanup, server start, health poll, `Start-Process` browser | backend | Parity with Linux launcher | B2-01 |
| B2-03 | Add `scripts/package-windows.nsi` + `scripts/package-desktop-windows.ps1` — stage `pixelanea-server.exe`, `web/`, icon; NSIS install + portable | backend | P0 Windows `.exe` | B2-01, B2-02 |
| B2-04 | Implement `Win32FileDialogProvider` (`server/src/api/win32_file_dialog_provider.cpp`) + CMake/platform wiring in `main.cpp` | backend | Workshop File → Open without path typing | B2-01 |
| B2-05 | Extend `release.yml` with `windows-latest` job; cache vcpkg; upload `pixelanea-{version}-win64-setup.exe` | backend | CI parity | B2-03 |
| B2-06 | Windows install section in `docs/user-guide.md` + workshop Win10 browser note | frontend | Facilitator playbook | B2-03 |

### Batch 3 — Polish & P1 platforms

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | `scripts/package-deb.sh` arm64 on `ubuntu-22.04-arm` runner | backend | P1 ARM Linux | B1-02 |
| B3-02 | `THIRD_PARTY_NOTICES.md` generator from vcpkg + npm for release bundles | both | License compliance | B1-02, B2-03 |
| B3-03 | Optional Authenticode signing step in `release.yml` (secret `WIN_CERT`) | backend | SmartScreen mitigation | B2-05 |
| B3-04 | Lab bulk-install helper `scripts/workshop-prep-linux.sh` — `apt install ./deb` + `zenity` | backend | Alex pre-session automation | B1-02 |
| B3-05 | Win7 best-effort doc + manual QA matrix row | frontend | Close Taylor open question | B2-06 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 5 | 1 | 0 | 6 |
| Batch 2 | 5 | 1 | 0 | 6 |
| Batch 3 | 4 | 1 | 1 | 6 |

**Effort estimates (Jordan):**

| Batch | Person-weeks | Notes |
|-------|--------------|-------|
| Batch 1 | 1.0–1.5 | Mostly scripting; staging exists |
| Batch 2 | 2.0–2.5 | First Windows green build dominates |
| Batch 3 | 1.0–1.5 | arm64 + signing optional |

## Packaging options — RICE comparison

Scores compare **format/strategy options** for prioritization (not implementation batches).

| Option | Reach (users/qtr) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|--------|-------------------|-----------------|----------------|----------------------|------|------|
| Linux `.deb` amd64 | 800 | 2.0 | 85% | 0.5 | 2720 | 1 |
| Linux tar.gz (keep) | 600 | 1.5 | 95% | 0.1 | 8550 | — (sunk, maintain) |
| Windows NSIS `.exe` | 1200 | 2.5 | 70% | 2.0 | 1050 | 2 |
| Linux arm64 `.deb` | 150 | 1.0 | 75% | 0.3 | 375 | 4 |
| Inno Setup (alt) | 1200 | 2.5 | 65% | 2.0 | 975 | 3 |
| MSI / WiX | 200 | 1.5 | 50% | 2.5 | 60 | 6 |
| snap | 300 | 1.0 | 40% | 2.0 | 60 | 6 |
| flatpak | 250 | 1.0 | 40% | 2.5 | 40 | 7 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` — Confidence as decimal.

## RICE analysis (batches)

| Batch | Reach (users/quarter) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|----------------------|-----------------|----------------|----------------------|------|------|
| Batch 1 — Linux `.deb` + release CI | 800 | 2.0 | 85% | 1.25 | 1088 | 1 |
| Batch 2 — Windows NSIS + build | 1200 | 2.5 | 70% | 2.25 | 933 | 2 |
| Batch 3 — arm64, signing, polish | 400 | 1.0 | 75% | 1.25 | 240 | 3 |

**RICE notes:**

- Batch 1 ranks first on confidence and effort — tar.gz already proves the staging model; `.deb` is thin metadata on top.
- Sam would promote Batch 2 despite near-parity RICE because **Windows is ~60% of Riley workshop downloads** in prior brainstorm assumptions — strategic, not RICE-derived.
- Batch 3 signing is low RICE but high trust — defer until artifacts exist.

## CI / build recommendations

| Topic | Recommendation |
|-------|----------------|
| **New workflow** | `.github/workflows/release.yml` triggered on `push: tags: ['v*']` |
| **Linux runner** | `ubuntu-22.04` (glibc 2.35 baseline); `sudo apt install dpkg-dev` |
| **Windows runner** | `windows-latest` **native build** — do not cross-compile MSVC from Linux |
| **Build type** | `Release` via existing `scripts/build-desktop.sh` / new PS1 twin |
| **Caching** | Reuse `deps-hash.py` / `assets-hash.py` patterns from `build.yml`; add vcpkg binary cache on Windows |
| **Artifacts** | `pixelanea_{version}_amd64.deb`, `pixelanea-{version}-linux-amd64.tar.gz`, `pixelanea-{version}-win64-setup.exe` |
| **Version source** | `VERSION` file (currently `1.0.0`) — tag must match |
| **Debug CI** | Keep existing `build.yml` Debug gate unchanged |
| **Draft release** | `softprops/action-gh-release` with `draft: true` until Taylor approves |

```yaml
# release.yml sketch (jobs)
jobs:
  release-linux:
    runs-on: ubuntu-22.04
    steps: [checkout, pnpm, deps-cache, build-desktop.sh, package-deb.sh, package-desktop-linux.sh, upload]
  release-windows:
    runs-on: windows-latest
    steps: [checkout, pnpm, build-desktop-windows.ps1, package-desktop-windows.ps1, upload]
```

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 72 | 22 | high impact / low risk | Docker smoke test; pin glibc doc |
| Batch 2 | 85 | 58 | high impact / medium risk | Native Windows CI; path-dialog fallback ships first; spike week 1 |
| Batch 3 | 35 | 45 | low impact / medium risk | Signing secrets optional; arm64 manual QA |

```text
Impact ↑
100 │     │ HI/HRI │
 75 │     │ B2     │
 50 │     │ HI/LR  │
 25 │ B3  │ B1     │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Decisions & open questions

### Agreed

- **Linux P0:** `.deb` via `scripts/package-deb.sh` + `dpkg-deb`; keep `package-desktop-linux.sh` tar.gz.
- **Windows P0:** NSIS via `scripts/package-windows.nsi`; not MSI for v1.
- **No snap/flatpak** until post-v1 and dedicated maintainer.
- **zenity optional** (`Recommends`); workshop prep installs it explicitly.
- **glibc floor:** 2.35 (Ubuntu 22.04 builder).
- **OS floor:** Win10+ for P0; Win7 best-effort P1 with documented browser requirements.
- **CI:** tag-triggered `release.yml`; Linux + Windows native jobs.
- **User-level vs system:** `.deb` installs system-wide under `/opt` or `/usr/lib` (simpler for lab images); tar.gz remains user-level portable.

### Deferred

- MSI/WiX enterprise installer.
- snap/flatpak distribution.
- Auto-update channel.
- Embedded browser (CEF/WebView2) — would solve Win7 browser gap but violates "quick" scope.

### Open questions for Taylor

1. **Win7 hard requirement?** If yes, budget VS 2019 toolchain + older browser matrix; if no, ship Win10+ and close the issue.
2. **Install scope on Linux `.deb`:** system-wide (`/opt/pixelanea`, needs sudo) vs user-level `.deb` (rare pattern) — default recommendation is system-wide for lab `apt install`.
3. **Code signing budget for v1?** Unsigned NSIS is acceptable for open-source beta with README callout — confirm before Batch 3.
4. **GitHub Releases vs workshop USB-only?** Assumption: public GitHub Release assets on tag; confirm if private mirror needed for schools.
5. **Versioning:** CI already bumps on main push (`ci-bump-and-push.sh`) — align tag workflow with semver discipline for facilitators.

## Recommended next action

**Implement Batch 1 first** (backend-owned, ~1–1.5 person-weeks): extract `scripts/stage-linux-desktop.sh`, add `scripts/package-deb.sh` with `dpkg-deb`, wire `release.yml` for tagged Linux artifacts, and update `docs/workshop/teacher-guide.md` so Alex can `apt install` on lab images before the next workshop. Success = fresh Ubuntu 22.04 VM installs `.deb`, application menu launches Pixelanea, `/api/health` returns OK, and File → Save works with `zenity` installed. Windows (Batch 2) starts in parallel only after a one-day Windows build spike confirms `x64-windows-static` Release binary runs — do not block Linux ship on Windows green build.
