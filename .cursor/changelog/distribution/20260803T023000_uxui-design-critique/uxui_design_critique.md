# UX/UI Design Critique — Distribution & Install Journey

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-03 |
| **Target** | Linux tar.gz + planned .deb; planned Windows .exe/.msi — `scripts/package-desktop-linux.sh`, `scripts/install-desktop-linux.sh`, `README.md`, `docs/workshop/teacher-guide.md`, launcher scripts |
| **Persona** | Riley (primary), Morgan (workshop facilitator) |
| **Scope** | Implemented (Linux portable/user install) + planned (.deb, Windows) |

## Job statement

When I **want Pixelanea on my machine (or thirty lab machines)**, I want **one obvious download, a trustworthy install, and an app that opens ready to draw**, so I can **paint my first pixel without reading DEPENDENCIES.md or filing a support ticket**.

## Golden path

**Riley (Linux, ideal .deb path — not shipped yet):**

Download page → **Download for Linux (64-bit)** → double-click `.deb` or `sudo apt install ./pixelanea_*.deb` → app menu shows **Pixelanea** → click → browser opens editor → pick color → paint → **Save As** with native picker → **Project saved.**

**Riley (Linux today):**

GitHub/releases → `pixelanea-1.0.0-linux-amd64.tar.gz` → extract → `./install.sh` OR `./pixelanea` → menu or `pixelanea` command → browser → paint → save (zenity or path fallback).

**Morgan (workshop):**

IT image with Pixelanea + zenity preinstalled → students open menu icon → teacher USB template → **File → Open** → save to known folder → zero install questions.

**Windows (planned):**

Download **Pixelanea Setup (64-bit)** → Next → Install → Finish → Start menu shortcut → browser/editor → paint → save via native dialog.

## Dialogue summary

**Round 1 — Job & golden path:** Maya flagged that Morgan's documented path still points to `./scripts/dev.sh` and DEPENDENCIES.md (`docs/workshop/teacher-guide.md`), not the packaged launcher — that alone violates "zero install support tickets." Leo noted the desktop entry already uses DESIGN.md tagline in `Comment=` but there is no install splash or marketing lockup anywhere in the distribution story.

**Round 2 — Mistakes audit:** Both agreed port `8787` silent kill (`fuser -k`) is implementation leakage and trust-breaking (mistake 8). Zenity warnings go to stderr while `.desktop` sets `Terminal=false` — invisible on first launch (mistake 2, 10). No uninstall documented (mistake 10). Artifact is `.tar.gz` not one-click `.deb` — primary action unclear on a hypothetical download page (mistake 1).

**Round 3 — Practices & polish:** Progressive disclosure applies: Riley gets silent install; Morgan gets documented silent/mass flags. Leo wants download page hierarchy: **Download** (accent) + **View on GitHub** (outline) per DESIGN.md; filename pattern `Pixelanea-{version}-linux-amd64.deb` with human label "Linux (Ubuntu/Debian 64-bit)." Maya wants first-run continuity: browser opens editor, not a raw `127.0.0.1` URL in README.

**Round 4 — Edge cases & synthesis:** Port conflict, missing zenity, no browser, ARM vs amd64, Windows 7 file dialogs, uninstall, and offline-after-install are all designed incompletely. Converged P0s: workshop doc drift, invisible zenity gap, silent port kill. Windows P0: ship with native save/open, not zenity assumptions.

## Findings

### Critical (P0) — blocks task completion or trust

- **Workshop guide still describes dev install, not desktop package.** `docs/workshop/teacher-guide.md` tells facilitators to run `./scripts/dev.sh` and open `localhost:5173`. Morgan's success metric is "zero install support tickets" (`UX.md`); the guide guarantees tickets for anyone following it on release builds.
- **Zenity gap is invisible on normal first launch.** Packaged launcher warns about missing zenity only via `echo` to stderr (`scripts/package-desktop-linux.sh` lines 60–62, 138–140) while `pixelanea.desktop` sets `Terminal=false`. Menu launch hides the hint; students hit manual path dialog during save — Morgan's highest-risk moment.
- **Silent port 8787 termination without user consent.** If another process (or second Pixelanea instance) holds the port, launcher runs `fuser -k "${PORT}/tcp"` before starting. Riley may lose another app's state or get a confusing browser tab with no explanation. Plain-language recovery is missing (mistake 8).
- **No Linux uninstall path.** `install.sh` copies to `~/.local` but documents no removal (`README.txt`, `install.sh` success text). Facilitators cannot cleanly reset lab machines or document rollback for IT.
- **Windows: no packaged path; file I/O story undefined.** Server hardcodes `ZenityFileDialogProvider` (`server/src/main.cpp`). Windows 7+ installer without native Open/Save breaks Morgan's "save a project" workshop exit — worse than Linux's path fallback if not designed upfront.

### Warnings (P1) — meaningful friction or inconsistency

- **No `.deb` / one-click Linux artifact today.** Only `pixelanea-{version}-linux-{arch}.tar.gz` (`scripts/package-desktop-linux.sh`). Riley expects "Ubuntu → .deb"; tar + `install.sh` reads developer-facing.
- **Artifact naming lacks platform clarity for mixed workshops.** Pattern is good internally (`pixelanea-1.0.0-linux-amd64`) but a download page needs visible labels: OS, CPU (amd64/arm64), and "portable tar.gz vs package manager" — avoid two CTAs with equal weight (mistake 1).
- **README post-install tells users to open URL manually.** `install-desktop-linux.sh` ends with "Then open: http://127.0.0.1:8787" even though the launcher opens the browser — splits the golden path and leaks implementation (mistake 8).
- **`install-desktop-linux.sh` omits zenity notice** present in packaged `install.sh` / `pixelanea` launcher — dev install path is quieter than release path; inconsistent facilitator QA.
- **No first-run install wizard messaging.** DESIGN.md specifies "Marketing / installer / first-run: name + subtitle" (`Pixelanea` + *Pixel art editor on your computer*). Installers ship no splash, no "Works without internet" line — brand promise only appears in `.desktop` Comment.
- **Download page / releases UX not defined in repo.** README is developer-centric (pnpm, CMake). Riley landing from GitHub Releases gets no curated "Download for Linux" vs "Build from source" separation (mistake 5).
- **Workshop mass-install undocumented.** No silent flags (`install.sh --prefix`, `.deb` postinst, Windows `/S`) in teacher or IT docs — Morgan relies on ad-hoc scripting.
- **Windows installer accessibility baseline unspecified.** MSI/EXE should support keyboard navigation, focus order, and screen-reader names on controls; no acceptance criteria yet (mistake 9, light touch).

### Suggestions (P2) — polish and delight

- **Garden Frame icon at 512×512** for Windows installer splash and Linux AppStream/metainfo (`DESIGN.md` Garden Frame spec).
- **Optional first browser session banner** (in-app, not installer): "Files stay on your device. No account needed." — positive offline framing from DESIGN.md voice table.
- **Checksums + release notes** beside each artifact ("Works on Ubuntu 22.04+, Debian 12+; zenity recommended").
- **Portable vs installed choice** on download page: "Run without installing" (tar.gz) as secondary ghost link for Riley power users.
- **Uninstall desktop entry** on Windows; `pixelanea-uninstall.sh` or `apt remove` for Linux — with plain copy: "Your `.pixelanea` files are not deleted."

## Mistakes checklist (ux-seamless-flows)

- [ ] Primary action obvious? — **No** on planned download page; tar.gz today competes with "clone and build"
- [ ] State visible (loading/saved/error)? — **Partial** — server health wait exists; port kill and zenity gap hidden
- [ ] Modals justified? — **N/A** install; in-app path dialog is acceptable fallback if explained once visibly
- [ ] Patterns consistent? — **No** — dev vs package vs teacher doc diverge
- [ ] Overwhelming on first visit? — **Risk** if README is the only entry
- [ ] Edge cases designed? — **Weak** — port conflict, no browser, no curl, ARM, uninstall
- [ ] Hierarchy matches priority? — **Not yet** — no marketing/download layer
- [ ] Beauty serves clarity? — **Partial** — tagline in `.desktop`; no installer visual system

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ❌ | Teacher guide breaks path; manual URL in install output |
| One decision per step | ⚠️ | tar.gz forces "portable vs install.sh" without guidance |
| Progressive disclosure | ⚠️ | Advanced portable path OK as secondary; not labeled |
| Immediate feedback | ⚠️ | `install.sh` prints success lines; menu launch gives no zenity feedback |
| Forgiving (undo/autosave) | ✅ | Editor-side; install journey has no destructive confirm except port kill |
| Visual hierarchy | ❌ | No download/install UI yet |
| Flow tested end-to-end | ❌ | Workshop QA checklist exists for zenity in-app, not for package install |

## Agreed recommendations

1. **Rewrite workshop teacher install section** to packaged desktop path (`install.sh` or future `.deb`), zenity preflight, and menu launcher — remove `dev.sh` as default. **Owner:** ux · **Effort:** S

2. **Surface zenity requirement before save pain:** bundle zenity as recommended dep in `.deb`; for tar.gz, show a **one-time graphical notice** (zenity/info dialog or in-app banner on first launch when picker unavailable) — not stderr-only. Align copy with `apps/web/src/content/errors.ts` `filePickerUnavailable`. **Owner:** eng · **Effort:** M

3. **Replace silent `fuser -k` with user-visible policy:** detect port in use → dialog: "Pixelanea is already running" (open existing) vs "Use a different port" vs cancel; never kill unrelated processes silently. **Owner:** eng · **Effort:** M

4. **Ship Debian/Ubuntu `.deb`** with `Depends: zenity, curl` (or `Recommends:`), `pixelanea.desktop`, and `apt remove` uninstall. Filename: `pixelanea_{version}_amd64.deb`; human label "Linux (Debian/Ubuntu, 64-bit)." **Owner:** eng · **Effort:** L

5. **Download / Releases page structure** (GitHub Pages or README banner): primary **Download** + secondary **View on GitHub**; separate "Build from source" below fold. Per OS sections with subtitle under name: *Pixel art editor on your computer*; tagline *Make pixel art. Keep it local.* as hero line. **Owner:** ux/ui · **Effort:** M

6. **Document uninstall** for Linux (`rm` paths + desktop file + `update-desktop-database`) and require Windows uninstaller in MSI/EXE scope. **Owner:** eng · **Effort:** S

7. **Windows installer (7+):** MSI or Inno/NSIS with silent `/S` or `msiexec /quiet` for Morgan; Start Menu shortcut; optional "Launch Pixelanea" finish checkbox; native file dialogs (not zenity). Artifact: `Pixelanea-{version}-win64-setup.exe`. **Owner:** eng · **Effort:** L

8. **Mass-deploy appendix for facilitators:** one-page IT sheet — silent install commands, zenity package line, verify `command -v zenity`, sample student save path template, port 8787 note. **Owner:** ux · **Effort:** S

9. **Remove manual URL from install success text** (`install-desktop-linux.sh`); say "Open Pixelanea from your applications menu" only. **Owner:** eng · **Effort:** S

10. **Installer accessibility (light touch):** keyboard-tab through Windows wizard controls; visible focus; `aria-label` on icon-only back/next; no timed auto-advance; test with Narrator once before release. **Owner:** ui · **Effort:** S

## Unresolved tension

- **Maya** wants zenity **required** in `.deb` `Depends` so Morgan never sees path dialog. **Leo** worries hard dep blocks minimal installs and inflates "approachable" story on download page. **Proposed product call:** `Depends` on curated `.deb`; `Recommends: zenity` on portable tar.gz + visible first-run notice if missing.

- **Leo** wants a branded 3-step Windows wizard (welcome → folder → finish) for trust. **Maya** prefers silent default for Riley with optional "Customize" — wizard steps must not block Morgan's mass silent install. **Proposed:** branded but skippable wizard; silent mode for IT.

## Files reviewed

- `scripts/package-desktop-linux.sh`
- `scripts/install-desktop-linux.sh`
- `dist/pixelanea-1.0.0-linux-amd64/README.txt` (generated sample)
- `README.md`
- `docs/workshop/teacher-guide.md`
- `docs/user-guide.md` (desktop file picker section)
- `apps/web/src/content/errors.ts`
- `server/src/main.cpp` (ZenityFileDialogProvider)
- `UX.md` (Riley, Morgan personas, metrics)
- `DESIGN.md` (brand copy, marketing CTAs, installer/first-run, Garden Frame)
- `DEPENDENCIES.md` (Windows static triplet notes)

## References

- `.cursor/skills/ux-seamless-flows/SKILL.md` — 12 mistakes, top 10 practices
- `UX.md` — Morgan "zero install support tickets"; Riley frictionless install; product promise
- `DESIGN.md` — tagline/subtitle rules, Download + GitHub CTA hierarchy, Garden Frame, voice table
