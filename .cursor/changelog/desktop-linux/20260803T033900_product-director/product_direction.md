# Product Direction — Debian/Ubuntu Desktop Distribution

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Session type** | Product review |
| **Feature area** | desktop-linux |
| **Primary persona** | Riley (hobby game dev) — installer downloader; Morgan (workshop teacher) and school IT as secondary consumers of pre-staged installs |
| **Teams convened** | Strategy (Sam, Jordan) |
| **Upstream artifacts** | `.cursor/changelog/desktop-linux/20260803T033900_product-refinement/loop-backlog.md` |

## Product vision

Pixelanea on Linux should feel like a real app you can install in one step — not a developer checkout. For Debian and Ubuntu users, that means downloading a `.deb`, double-clicking or running `sudo dpkg -i`, and opening Pixelanea from the application menu. The canvas opens in the system browser today, and that is acceptable for v1: local-first trust, zero accounts, and creative flow matter more than window chrome. Tarball and user-level scripts remain for labs and contributors, but Riley's path is the `.deb` on GitHub Releases.

## Chair brief

**Product question:** What is the primary install path for Debian/Ubuntu users, what defines a "quick installer," and what ships in the next shippable batch?

**Primary persona:** Riley — wants to install and paint tonight without git, build tools, or support tickets.

**Success looks like:** Riley downloads `pixelanea_1.0.x_amd64.deb` from a GitHub Release, installs with one command, launches from the app menu, paints an 8-frame loop, and saves a `.pixelanea` file — with optional zenity for native Open/Save dialogs.

**Constraints:** Local-first, no accounts/cloud; minimal install friction; canvas is hero; packaging stays in scripts/CI/docs (no application layer changes); browser-shell acceptable for v1.

**Teams convened:** Strategy only. Design not convened — install UX is standard Debian patterns; zenity messaging is a stderr note, not a flow redesign.

## Synthesis

### Aligned

- **Primary path:** `.deb` (`sudo dpkg -i` or GUI double-click) is the public install story for Debian/Ubuntu.
- **Secondary path:** Portable tarball with `./pixelanea` (no install) or `./install.sh` (user-level `~/.local`) for no-root labs and advanced users.
- **Dev/workshop path:** `install-desktop-linux.sh` stays for git-based lab prep and contributors — not the Riley download story.
- **Quick installer = `.deb`**, not AppImage or Flatpak for v1.
- **Browser-shell is v1-acceptable;** embedded WebView (Tauri/wry) is roadmap P2, not a release blocker.
- **Persona priority for the installer:** Riley → school IT → Morgan (who receives pre-staged machines, not the download UX).
- **P0 batch:** DRY shared launcher, validated `.deb` smoke, documented install matrix, CI-built `.deb` + tarball on GitHub Release.
- **Consolidate logic, not scripts:** Extract `scripts/pixelanea-launch.sh`; keep thin `package-deb.sh` and `package-desktop-linux.sh` wrappers.

### Tensions & product calls

| Tension | Teams | Taylor's call | Rationale |
|---------|-------|---------------|-----------|
| `.deb` vs tarball as "primary" (tarball has higher raw RICE, lower effort) | Strategy | **`.deb` is primary UX story; tarball is companion artifact** | Riley and IT expect `.deb` on Ubuntu; tarball covers edge cases without competing messaging |
| Browser-shell vs native window for "dedicated app" | Strategy | **Browser-shell ships v1; WebView deferred to v1.1+** | Morgan's metric is save rate, not chrome; WebView is 6+ pw with low confidence |
| Morgan pilot (E2-021) vs packaging ship | Strategy | **Ship packaging in parallel with pilot** | Format choice does not block pilot; pilot validates zenity/docs, not installer type |
| Unsigned `.deb` vs GPG signing for school IT | Strategy | **Unsigned acceptable for v1.0.x; document trust model** | Hobbyist reach >> IT gatekeeping at this stage; signing is P1 if IT feedback demands it |
| GitHub Releases vs landing-page CTA | Strategy | **GitHub Releases is canonical download for v1.0.x** | README + release notes link there; landing page can follow |
| Patch cadence (1.0.1) vs hold until 1.1.0 | Strategy | **Rebuild `.deb` + tarball on every tagged patch** | Installers must track VERSION file; stale artifacts erode trust |
| Snap for Ubuntu Software Center | Strategy | **Defer Snap** — same maintenance cost as Flatpak without lab benefit | `.deb` + tarball sufficient; revisit only if user demand surfaces |

### Decisions

**We will**

- Ship `.deb` as the primary public install path for Debian/Ubuntu (amd64 P0).
- Ship tarball as secondary companion on the same GitHub Release.
- Extract shared launcher script and rewire all three install/packaging paths (B1-01).
- Validate `.deb` install smoke and add CI release job for both artifacts (B1-02, B1-05).
- Document install matrix in README and user guide: `.deb` primary, tarball secondary, user script for dev/workshop (B1-03).
- Keep browser-shell architecture for v1; note in release docs that Pixelanea opens in the system browser.
- Recommend `zenity` via `.deb` Recommends and stderr hint; in-app path dialog remains fallback.

**We will not (this loop)**

- AppImage, Flatpak, Snap, or APT PPA.
- Embedded WebView / Tauri / Electron shell.
- arm64 advertising until P1 smoke validation.
- Frontend or application-layer changes for packaging.
- Merge the three install paths into one script — document when to use each.

## Outcomes

| Priority | Outcome | Owner hint | Source |
|----------|---------|------------|--------|
| P0 | Shared `scripts/pixelanea-launch.sh`; all packagers consume it | eng (scripts) | strategy B1-01 |
| P0 | `.deb` smoke validated: install, menu launch, health, uninstall | eng | strategy B1-02 |
| P0 | README + user-guide install matrix (.deb / tarball / dev script) | eng + docs | strategy B1-03 |
| P0 | GitHub Actions release job: amd64 `.deb` + tarball on tag | eng (CI) | strategy B1-05 |
| P0 | `pnpm package:desktop` alias for tarball; release checklist documents both packagers | eng | strategy B1-04 |
| P1 | arm64 build smoke; workshop/teacher docs updated for IT `.deb` fleet install | eng + docs | strategy B2-01, B2-02 |
| P1 | Install smoke test script in container; shared `.desktop` template | eng | strategy B2-03, B2-04 |
| P1 | Release notes template with deps and browser-shell caveat | eng + docs | strategy B2-05 |
| P2 | WebView shell spike; AppImage/Flatpak; PPA; system tray / single-instance | eng + product | strategy Batch 3 |

## Recommended next action

Invoke **skill-implementer** or **AGENT-recursive-implementer** for **Batch 1 (P0)**: extract `scripts/pixelanea-launch.sh` and rewire `install-desktop-linux.sh`, `package-desktop-linux.sh`, and `package-deb.sh`; run manual `.deb` + tarball smoke in `ubuntu:latest`; add a `release.yml` CI job that builds and attaches both artifacts on tag; update README and `docs/user-guide.md` with the install matrix. **Success metric:** A tagged `v1.0.x` release ships `pixelanea_1.0.x_amd64.deb` and `pixelanea-1.0.x-linux-amd64.tar.gz`; Riley installs without git and saves a project from the app menu.

## Open questions

- **GPG signing:** Revisit if school IT pilots block on unsigned packages — not a v1.0.x blocker.
- **WebView timing:** Gate P2 spike on Morgan pilot ≥80% save rate (E2-021) plus two stable `.deb` releases.
- **Flatpak/AppImage demand:** Monitor GitHub issues / workshop feedback before Batch 3 prioritization.
