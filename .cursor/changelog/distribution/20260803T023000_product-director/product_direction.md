# Product Direction — Quick Installers (Debian + Windows)

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Session type** | Product review |
| **Feature area** | distribution |
| **Primary persona** | Riley (hobbyist); Morgan / workshop facilitators (Alex slice) |
| **Teams convened** | Design (Maya, Leo) + Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/distribution/20260803T023000_uxui-design-critique/uxui_design_critique.md`, `.cursor/changelog/distribution/20260803T023000_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea wins workshops and first-time installs when **download → install → first pixel** feels as local and trustworthy as saving a `.pixelanea` file. Riley should get one obvious artifact per OS—**`.deb` on Debian/Ubuntu** and a **single Windows setup `.exe`**—without reading `DEPENDENCIES.md`. Morgan should pre-image lab machines with **silent, documented installs**, zenity available before students hit Save, and **no dev-server instructions** in the teacher guide. We keep the existing browser-hosted architecture (server + static web on `127.0.0.1:8787`); installers are thin wrappers around assets we already build, not a Tauri pivot or release-engineering platform. This release makes workshop readiness real: **zero install support tickets** becomes a testable outcome, not a README aspiration.

## Chair brief

**Product question:** How do we ship maintainable, workshop-ready installers for Debian/Ubuntu and Windows without building enterprise release infrastructure—and what ships in which batch?

**Primary persona:** Riley (frictionless install); Morgan / Alex workshop slice (mass pre-install, zero tickets).

**Success looks like:** Fresh Ubuntu 22.04 VM: `apt install ./pixelanea_*.deb` → menu icon → browser editor → save with native picker. Win10 VM: double-click setup `.exe` → Start Menu → paint → save. Teacher guide references installers only; facilitators can silent-install before class.

**Constraints:** Local-first, no cloud/accounts; canvas hero (install chrome recedes); layer boundaries unchanged; in-repo scripts + CI artifacts, not Flathub/snap maintenance; unsigned beta acceptable for v1 with honest README callout.

**Teams convened:** Design + Strategy

## Synthesis

### Aligned

- **Linux P0 = `.deb` (amd64)** via `dpkg-deb` / `scripts/package-deb.sh`, **parallel** existing `tar.gz` portable bundle.
- **Windows P0 = NSIS** single setup `.exe` (`scripts/package-windows.nsi`); **not MSI/WiX** for v1.
- **Defer snap, flatpak, auto-update, embedded browser** until post-v1 with dedicated maintainer.
- **Static-linked Windows server** (`x64-windows-static`) → no VC++ redistributable step.
- **glibc floor 2.35** — build releases on `ubuntu-22.04` (Debian 12 / Ubuntu 22.04+).
- **zenity is part of the workshop story** — must be installed or surfaced before Save, not hidden on stderr.
- **Workshop docs must switch** from `dev.sh` / `localhost:5173` to packaged desktop path.
- **Tag-triggered `release.yml`** publishing `.deb`, `tar.gz`, and Windows `.exe` to GitHub Releases.
- **System-wide `.deb`** under `/opt` or `/usr/lib` + `/usr/bin/pixelanea` — simpler for lab `apt install` than rare user-level `.deb`.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| zenity `Depends` vs `Recommends` in `.deb` | Design: hard dep for Morgan; Design: soft dep for "approachable" story | **`Recommends: zenity`** on `.deb`; **workshop IT sheet requires** `apt install zenity`; **first-run visible notice** (not stderr-only) when picker unavailable | Balances Riley minimal install with Morgan's save moment; IT prep is explicit, not surprise |
| Silent `fuser -k` on port 8787 | Design: trust-breaking | **P0 fix:** detect port in use → user-visible choice (open existing / different port / cancel); **never kill unrelated processes silently** | Matches local-first trust; port number stays implementation detail in UI |
| Win7+ vs Win10+ tested floor | Strategy: VS 2022 + React 19 constrain Win7; User asked Win7+ | **P0 tested floor: Windows 10 x64**; **Win7 documented best-effort** with pinned browser list (Firefox ESR); IE11 unsupported | "Win7+" in request = don't block Win7 users from trying, but don't delay ship on VS 2019 toolchain |
| NSIS wizard vs silent mass install | Design: branded wizard vs silent IT | **Branded 3-step wizard default** (welcome → folder → finish); **silent `/S` (or equivalent) documented for Morgan** | Riley gets trust signal; facilitators get automation |
| Batch order: Linux first vs Windows parallel | Strategy: Batch 1 Linux RICE winner; Sam: ~60% workshop Windows | **Ship Batch 1 (Linux) first**; **allow 1-day Windows build spike in parallel** — do not gate Linux on Windows green build | Linux staging exists; Windows is higher risk but shouldn't block `.deb` |
| Code signing | Strategy: P1 optional | **Unsigned P0** with README SmartScreen callout; signing **P1** when budget confirmed | Open-source beta honesty beats fake enterprise polish |

### Decisions

**We will**

- Extract shared `scripts/stage-linux-desktop.sh` from `package-desktop-linux.sh` (DRY).
- Add `scripts/package-deb.sh` — `dpkg-deb`, `DEBIAN/control`, postinst/prerm, `.desktop`, `Recommends: zenity`.
- Keep `scripts/package-desktop-linux.sh` tar.gz as portable secondary artifact.
- Add `scripts/build-desktop-windows.ps1`, `scripts/pixelanea-launch.ps1` (or `.cmd`), `scripts/package-windows.nsi`, `scripts/package-desktop-windows.ps1`.
- Implement `Win32FileDialogProvider` for Windows Open/Save (Batch 2 — workshop save exit).
- Add `.github/workflows/release.yml` on `v*` tags — `ubuntu-22.04` + `windows-latest` native builds.
- Update `docs/workshop/teacher-guide.md`, `docs/user-guide.md`, install success copy (no manual `127.0.0.1` URL).
- Document uninstall (`apt remove`, Windows uninstaller, tar.gz path cleanup).
- Add facilitator **mass-deploy appendix** — silent install, zenity preflight, verify commands.
- Define Releases/download hierarchy: primary **Download**, secondary **View on GitHub**, **Build from source** below fold.

**We will not (this loop)**

- Ship snap or flatpak.
- Ship MSI/WiX enterprise installer.
- Require code signing for v1.
- Embed WebView2/CEF to solve browser gap.
- Auto-update channel.
- Block Linux ship on Windows build completion.
- Mandate zenity as hard `Depends` (workshop prep + notice instead).

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | `pixelanea_{version}_amd64.deb` — `apt install`, menu entry, `pixelanea` in PATH | eng | strategy |
| P0 | `pixelanea-{version}-linux-amd64.tar.gz` still published alongside `.deb` | eng | strategy |
| P0 | `pixelanea-{version}-win64-setup.exe` (NSIS) — install + silent mode | eng | strategy |
| P0 | `release.yml` attaches Linux + Windows artifacts on version tag | eng | strategy |
| P0 | Workshop/user docs reference installers only; mass-deploy appendix | ux + eng | design |
| P0 | Port-in-use policy — no silent `fuser -k`; user-visible recovery | eng | design |
| P0 | Zenity gap surfaced visibly on first launch when picker unavailable | eng | design |
| P0 | Windows native Open/Save via `Win32FileDialogProvider` | eng | design + strategy |
| P1 | `pixelanea_{version}_arm64.deb` + arm64 tar.gz | eng | strategy |
| P1 | Win7 best-effort matrix + browser pin doc | ux | strategy |
| P1 | Authenticode signing (optional `WIN_CERT` secret) | eng | strategy |
| P1 | `THIRD_PARTY_NOTICES.md` in release bundles | eng | strategy |
| P1 | `scripts/workshop-prep-linux.sh` bulk helper | eng | strategy |
| P1 | Installer accessibility pass (Windows wizard keyboard + Narrator smoke) | ui | design |
| P2 | MSI/GPO deployment | eng | strategy |
| P2 | snap / flatpak | — | strategy |

## Batching plan

| Batch | Scope | Effort (Jordan) | Ship criterion |
|-------|-------|-----------------|----------------|
| **Batch 1 — Linux workshop install** | `stage-linux-desktop.sh`, `package-deb.sh`, `test-package-linux.sh`, `release.yml` (Linux job), doc updates | 1.0–1.5 pw | Ubuntu 22.04 VM: `.deb` install → menu → health OK → save with zenity |
| **Batch 2 — Windows installer** | Windows build PS1, launcher, NSIS, `Win32FileDialogProvider`, `release.yml` Windows job, docs | 2.0–2.5 pw | Win10 VM: setup `.exe` → Start Menu → paint → native save |
| **Batch 3 — Polish & P1** | arm64 `.deb`, signing, notices generator, workshop-prep script, Win7 doc | 1.0–1.5 pw | ARM smoke + optional signed Windows build |

**Batch 1 task IDs (implementer):** B1-01 … B1-06 from `loop-backlog.md`.

**Batch 2 task IDs:** B2-01 … B2-06.

**Batch 3 task IDs:** B3-01 … B3-05.

## Recommended next action

Invoke **skill-implementer** (or **AGENT-recursive-implementer**) on **Batch 1** starting with `scripts/stage-linux-desktop.sh` and `scripts/package-deb.sh`. Success metric: Docker `ubuntu:22.04` smoke (`scripts/test-package-linux.sh`) passes; tagged release produces `.deb` + `tar.gz`; `docs/workshop/teacher-guide.md` lab prep is ≤5 steps with no `dev.sh`. In parallel, run a **one-day Windows build spike** (`build-desktop-windows.ps1` only) to confirm `x64-windows-static` Release binary runs — results inform Batch 2 scheduling without blocking Linux ship.

## Open questions

1. **GitHub Releases vs USB-only distribution for schools?** Default assumption: public Release assets on `v*` tag; confirm if private mirror needed.
2. **Code signing budget for v1.0.0?** Unsigned ships with README callout unless budget approved before Batch 3.
3. **Version/tag discipline:** `ci-bump-and-push.sh` on main vs facilitator-facing semver tags — align `VERSION` file, git tag, and artifact names.
4. **Download landing:** GitHub Releases only vs minimal GitHub Pages download page (design recommends curated hierarchy).
