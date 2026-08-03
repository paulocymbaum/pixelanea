# Loop Backlog — Desktop Linux Distribution Strategy

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Feature area** | desktop-linux |
| **Trigger** | Taylor (Product Director) request: primary install path, next shippable batch, packaging consolidation for Debian/Ubuntu |
| **Horizon** | Next shippable batch (v1.0.x patch) + v1.1 packaging hardening |
| **Participants** | Jordan (Tech Lead), Sam (PM) |
| **Supersedes** | — |

## Context summary

Pixelanea ships today as a local C++ server plus static React bundle, launched via browser (`xdg-open` on `127.0.0.1:8787`). Three install paths exist: developer/user script (`install-desktop-linux.sh` → `~/.local`), portable tarball (`package-desktop-linux.sh`), and `.deb` (`package-deb.sh`, recently wired in `package.json` as `package:deb`). README and workshop docs still point at the developer script only; CI builds and tests but produces no release artifacts. Launcher logic is duplicated four times across packaging scripts. v1.0.0 shipped with desktop install via the user-level script; `.deb` appears complete but undocumented and unvalidated in CI.

## Dialogue summary

- **Sam:** Riley needs a one-command install from a GitHub release; Morgan needs a path IT can pre-stage without git checkout. Primary persona for the *installer* is Riley; Morgan/IT are secondary but dictate the no-root fallback.
- **Jordan:** `.deb` is the lowest-friction path for Debian/Ubuntu end users; tarball covers no-root labs; `install-desktop-linux.sh` stays for contributors. AppImage/Flatpak/WebView are out of scope for the next batch — each adds packaging surface without unblocking canvas work.
- **Sam:** Browser-shell is acceptable for v1 — Morgan's success metric is save rate, not window chrome. WebView is a v1.1+ roadmap item, not a release blocker.
- **Jordan:** Consolidate launcher into one shared script consumed by all packagers (~0.25 pw). CI release job for amd64 `.deb` + tarball (~0.25 pw). arm64 build support exists in scripts but needs smoke validation before advertising.
- **Convergence:** Batch 1 (P0) ships `.deb` as **primary** public install, tarball **secondary**, DRY launcher, docs/CI. Defer AppImage, Flatpak, PPA, WebView shell explicitly.

## RICE analysis — packaging options

Score **options** to choose primary path and deferrals. Reach = estimated Debian/Ubuntu installs/quarter at v1 scale.

| Option | Reach (installs/q) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|--------|-------------------|-----------------|----------------|----------------------|------|------|
| **.deb primary** (`sudo dpkg -i` / GUI double-click) | 800 | 2.0 | 90 | 0.75 | 1920 | **1** |
| **Tarball secondary** (portable + `./install.sh`) | 400 | 1.5 | 85 | 0.25 | 2040* | **2** |
| **User script** (`install-desktop-linux.sh`, dev/workshop) | 200 | 1.0 | 95 | 0.1 | 1900 | 3 |
| **AppImage** | 600 | 1.5 | 50 | 2.0 | 225 | 5 |
| **Flatpak** | 500 | 1.5 | 40 | 3.0 | 100 | 6 |
| **WebView shell** (Tauri/wry/Electron) | 800 | 2.5 | 35 | 6.0 | 117 | 4 |

**RICE formula:** `(Reach × Impact × Confidence) / Effort` — Confidence as decimal.

\* Tarball ranks high on RICE because effort is near-zero (script exists); it ships as a **companion artifact**, not the primary UX story.

### RICE notes

- **.deb wins strategically** despite slightly lower raw RICE than tarball-only: it is the expected artifact for Riley searching "install Pixelanea Ubuntu" and for IT evaluating `apt`-style packages.
- **WebView shell** has high impact but low confidence and 6+ pw — Sam accepts browser-shell for v1; Jordan will not fund WebView until install path is stable and Morgan pilot passes.
- **AppImage/Flatpak** duplicate maintenance without reaching school labs that block both; tarball + user script already cover no-root scenarios.

## Batched tasks

### Batch 1 — P0 Must ship (v1.0.x)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B1-01 | Extract shared launcher to `scripts/pixelanea-launch.sh` (INSTALL_DIR param); wire into `install-desktop-linux.sh`, `package-desktop-linux.sh`, `package-deb.sh` | backend | Four near-identical launchers today; drift risk on port/health/zenity logic | — |
| B1-02 | Validate `.deb` install smoke: `dpkg -i`, menu entry, `pixelanea` CLI, health check, uninstall | backend | `package-deb.sh` exists but unvalidated in CI; git shows in-progress deb tree | B1-01 |
| B1-03 | Document install matrix in README + `docs/user-guide.md`: **Primary:** `.deb`; **Secondary:** tarball; **Workshop/dev:** user script | both | Riley and Taylor need one authoritative story; README still says script-only | B1-02 |
| B1-04 | Add `pnpm package:desktop` script alias → `package-desktop-linux.sh`; document both `package:deb` and tarball in release checklist | backend | `package:deb` in `package.json` but no tarball alias; asymmetry confuses release | — |
| B1-05 | GitHub Actions release job: build amd64 `.deb` + tarball, attach to GitHub Release on tag | backend | CI (`.github/workflows/build.yml`) tests only; no distributable artifacts | B1-01, B1-02 |
| B1-06 | Zenity preflight note in `.deb` postinst or first-run stderr (already partial); align `docs/workshop/teacher-guide.md` checklist | both | Morgan metric: native Open/Save; `Recommends: zenity` in control file | B1-03 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 1 | 4 | 0 | 2 | 6 |

### Batch 2 — P1 Should ship (v1.0.x / v1.1)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B2-01 | arm64 `.deb` + tarball build smoke on aarch64 runner or cross-build doc | backend | Scripts declare arm64; untested — Raspberry Pi / ARM laptops | B1-02 |
| B2-02 | Workshop doc update: Morgan uses tarball `install.sh` OR IT `.deb` fleet install; keep `install-desktop-linux.sh` for git-based lab prep | both | `pilot-protocol.md` references script-only; IT may prefer `.deb` | B1-03 |
| B2-03 | Shared `.desktop` + icon template (single source for packagers) | backend | Desktop entry duplicated across three scripts | B1-01 |
| B2-04 | Install smoke test script (`scripts/test-desktop-install.sh`): tarball portable run, user install, deb install in container | backend | Prevents packaging regressions without manual QA | B1-02 |
| B2-05 | Release notes template: dependencies (`curl`, recommends `zenity`, `xdg-utils`), browser-shell caveat | both | Sets Riley expectations; reduces "where's the window?" support | B1-03 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 2 | 3 | 0 | 2 | 5 |

### Batch 3 — P2 Deferred (v1.1+)

| ID | Task | Scope | Rationale | Depends on |
|----|------|-------|-----------|------------|
| B3-01 | AppImage packaging | backend | Nice portability; high maintenance vs `.deb`+tarball coverage | B2-04 |
| B3-02 | Flatpak + Flathub submission | backend | Sandboxing complicates zenity/file dialogs; long review cycle | B2-04 |
| B3-03 | Embedded WebView shell (evaluate Tauri/wry vs Electron) | both | Native feel; 6+ pw; browser acceptable for v1 per UX | B1-05 |
| B3-04 | APT PPA or `apt.pixelanea.dev` hosted repo | backend | `dpkg -i` sufficient until update cadence demands it | B1-05 |
| B3-05 | Single-instance / system tray instead of port-kill on relaunch | both | UX polish; launcher currently `fuser -k` port 8787 | B3-03 |

**Scope rollup:**

| Batch | Backend | Frontend | Both | Total |
|-------|---------|----------|------|-------|
| Batch 3 | 3 | 0 | 2 | 5 |

## RICE analysis (batches)

| Batch | Reach (users/q) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE | Rank |
|-------|-----------------|-----------------|----------------|----------------------|------|------|
| Batch 1 — P0 packaging ship | 1000 | 2.0 | 85 | 1.0 | 1700 | **1** |
| Batch 2 — P1 hardening | 600 | 1.0 | 75 | 1.5 | 300 | 2 |
| Batch 3 — P2 formats/shell | 800 | 2.5 | 30 | 8.0 | 75 | 3 |

### RICE notes

- Batch 1 is the only batch that changes what Riley downloads — Sam will not promote Batch 2 above it despite workshop doc gaps.
- Batch 3 WebView would jump impact but stays deferred until Morgan pilot ≥80% save rate is recorded (E2-021).

## Risk & impact matrix

| Batch | Impact (0–100) | Risk (0–100) | Quadrant | Mitigation |
|-------|--------------|--------------|----------|------------|
| Batch 1 | 72 | 28 | high impact / low risk | Smoke test in Docker `ubuntu:latest` before tagging release |
| Batch 2 | 45 | 35 | low impact / low risk | arm64: test on one physical device before advertising |
| Batch 3 | 65 | 82 | high impact / high risk | Spike doc only; no commit until Batch 1 stable 2 releases |

```text
Impact ↑
100 │     │        │ HI/HRI (B3 WebView)
 75 │     │ B1     │
 50 │ B2  │        │
 25 │     │        │
  0 └─────┴────────┴──→ Risk
    0    25   50   75  100
```

## Feasibility notes (Jordan)

| Topic | Assessment |
|-------|------------|
| **Launcher DRY** | ~60 lines duplicated 4× across `install-desktop-linux.sh`, `package-desktop-linux.sh` (×2), `package-deb.sh`. Extract to `scripts/pixelanea-launch.sh` with `PIXELANEA_INSTALL_DIR` env or arg. Packagers copy or symlink; `.deb` wraps with fixed `/usr/share/pixelanea`. No application code changes; respects layer boundaries. |
| **CI artifact** | `build.yml` already runs on `ubuntu-latest` with apt deps. Add `release.yml` on tag push: `build-desktop.sh` → `package-deb.sh` + `package-desktop-linux.sh` → upload artifacts. ~1 day effort. |
| **arm64** | Both packagers map `aarch64` → `arm64`. Binary must be built on arm64 (or cross-compile server — not set up). P1, not P0. |
| **Dependency policy** | `Depends: curl`; `Recommends: zenity, xdg-utils`. Correct for v1 — hard-dep zenity would break minimal installs; in-app path dialog fallback exists per `docs/user-guide.md`. |
| **Browser-shell v1** | Acceptable. Server binds localhost only; no Electron attack surface. WebView deferred — would require window lifecycle, file-association, and likely new native deps without OpenAPI/domain changes. |
| **Consolidation scope** | Merge packager **logic**, not packager **scripts** — keep `package-deb.sh` and `package-desktop-linux.sh` as thin wrappers over shared templates. |

## Recommended scope cuts

| Cut | Reason |
|-----|--------|
| AppImage, Flatpak | Tarball + `.deb` cover 95% of Debian/Ubuntu personas; dual maintenance not justified pre-pilot |
| WebView / Tauri spike in v1.0.x | Browser-shell ships; canvas is hero — shell polish is v1.1+ |
| PPA / apt repo | Manual `.deb` install sufficient until update friction is measured |
| arm64 in P0 | amd64 covers workshop pilot hardware; arm64 in P1 after one verified build |
| Frontend changes | Packaging is scripts/docs/CI only — no React work in this loop |
| Unifying dev + release install into one script | Keep three paths; document when to use each |

## Decisions & open questions

### Agreed

- **Primary install path (Debian/Ubuntu):** `.deb` via `sudo dpkg -i` or GUI double-click (GDebi / GNOME Software).
- **Secondary:** tarball (`./pixelanea` portable or `./install.sh` for `~/.local`).
- **Workshop/dev path:** `install-desktop-linux.sh` (no root, git checkout) — Morgan pre-staging unchanged until docs updated in P1.
- **Quick installer definition:** `.deb` — not AppImage, not Flatpak for v1.
- **Native app feel:** browser-shell acceptable for v1; embedded WebView on roadmap (P2), not next batch.
- **Installer persona priority:** Riley (primary) → school IT (secondary) → Morgan (uses pre-staged installs, not the downloader).
- **P0 outcomes:** shippable `.deb` + tarball on GitHub Release, DRY launcher, documented install matrix, CI-built artifacts.

### Deferred

- AppImage, Flatpak, PPA, WebView shell, system tray, arm64 advertising.

### Open questions for Taylor

1. **GitHub Releases vs website download:** Is the v1.0.x patch tagged on GitHub Releases the canonical Riley download, or do we need a landing-page CTA first?
2. **Code signing / GPG for `.deb`:** Required for school IT trust, or acceptable unsigned for hobbyist v1?
3. **Morgan pilot gate:** Does packaging ship before or after E2-021 (≥80% save rate)? Sam recommends **parallel** — packaging does not block pilot; pilot validates zenity/docs not format.
4. **Version cadence:** Patch releases (1.0.1) with rebuilt `.deb`, or hold packaging GA until 1.1.0 feature batch?
5. **Commercial distro variants:** Any near-term need for Snap (Ubuntu Software Center) given Flatpak deferral?

## Recommended next action

Implement **Batch 1 (P0)** via skill-implementer or AGENT-recursive-implementer: (1) extract `scripts/pixelanea-launch.sh` and rewire all three install/packaging scripts, (2) run manual + scripted smoke on `.deb` and tarball, (3) add release CI job, (4) update README and user-guide with the install matrix (.deb primary, tarball secondary, script for dev/workshop). **Owner:** backend/scripts (no frontend). **Success:** Riley can download `pixelanea_1.0.x_amd64.deb` from a GitHub Release, install with one command, launch from app menu, paint and save — with zero git checkout required.
