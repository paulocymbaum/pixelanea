# UX/UI Design Critique — Cross-Platform Distribution & In-App Updates

## Meta

| Field | Value |
|-------|-------|
| **Date** | 2026-08-07 |
| **Target** | Update flow, first-run/post-install, trust messaging — Windows DMG + EXE vs existing Linux (`UpdateDialog.tsx`, `updater.rs`, `copy.ts`, `AppHeader.tsx`) |
| **Persona** | Riley (primary); Morgan constraints for installer trust |
| **Scope** | Mixed — Linux updater implemented; Windows/macOS distribution planned |

## Job statement

When I install or run Pixelanea on my OS, I want updates and first launch to feel safe and familiar, so I can get back to painting without account walls, scary security dialogs, or lost `.pixelanea` work.

## Golden path

**Install (OS-owned):** Download release → OS installer (DMG drag / NSIS wizard) → launch app  
**First run (Pixelanea-owned):** Canvas in one click → optional skippable Riley overlay  
**Update (Pixelanea-owned, user-initiated v1):** File → Check for updates… → see version + source → Install update → save work → Restart now  
**Done:** Same app, same local projects, no re-login

## Dialogue summary

**Maya:** Riley's job is Friday's walk cycle, not release engineering. Cross-platform update UX should be **one in-app pattern** (existing `UpdateDialog`) with platform mechanics hidden. Don't auto-prompt on launch — Morgan needs zero install tickets; interrupting paint breaks Riley.

**Leo:** Agree on unified dialog shell (`Dialog` + `DialogFooter` per DESIGN.md). But macOS users expect drag-to-Applications *outside* the app; Windows NSIS owns shortcuts. Pixelanea first-run = skippable overlay only — never re-teach "click Next." Chrome stays flat; trust copy in `text-secondary`, primary CTA stays "Install update."

**Maya:** `copy.updateDialogDescription` already says GitHub — good transparency. `mainCommit` in every message is jargon (mistake #8). Gate behind View → Show technical info. Add explicit "Your projects stay on this device" — local-first without paranoid tone (DESIGN.md voice).

**Leo:** Version belongs in dialog header row, not header chrome — canvas is hero. Progress: indeterminate spinner OK for check; **determinate bar** for download on Windows EXE (50–150 MB). Unsigned builds: SmartScreen/Gatekeeper are **red** — in-app can't fix; need signed releases + fallback "Download manually" link styled as `variant="ghost"` tertiary.

**Maya:** Restart phase must surface unsaved-work risk. `restart_ready` today only offers Later / Restart — no save nudge. Error copy from `updater.rs` leaks `pkexec`/`sudo` on Linux; Windows needs parallel UAC pattern, macOS needs quarantine recovery steps.

**Leo:** Partial install is P0 eng+ux: show "Update didn't finish — you're still on v{X}" with Retry + manual release link. Converged: **parity = flow parity, not Linux .deb semantics on Windows.**

## Findings

### Critical (P0) — blocks task completion or trust

- **Updater backend is Linux-only.** `InstallKind` = `user_local | portable | system_deb`; `resolve_download_url` matches `.deb` / `linux-*.tar.gz` only (`updater.rs`). Shipping Windows EXE / macOS DMG without extending backend makes `UpdateDialog` lie on those platforms.
- **No elevation / Gatekeeper error UX.** Linux surfaces `sudo apt install` on `pkexec` fail; Windows UAC deny and macOS "app is damaged" need dedicated recovery copy + "Open release page" escape hatch — not generic `updateDialogInstallFailed`.
- **Restart without save guard.** `restart_ready` calls `updater_restart_app` with no check for unsaved project (`projectStatus.kind === "unsaved"` in `AppHeader.tsx`). Data loss breaks local-first trust.
- **Unsigned distribution (red UX risk).** ADR notes SmartScreen + signing as workshop trust requirement. Unsigned EXE/DMG: users hit OS blockers *before* Pixelanea UI runs; in-app updater replacing binaries without signature/checksum verification is a second red trust gap.

### Warnings (P1) — meaningful friction or inconsistency

- **No download progress.** `downloading` phase shows static string (`copy.updateDialogDownloading`) — hidden state on slow networks (mistake #2).
- **Commit SHA in default copy.** `updateDialogUpToDate` / `updateDialogUpdateAvailable` expose `mainCommit` to all users — implementation leakage.
- **No first-run post-install surface.** DESIGN.md specifies installer/first-run uses name + subtitle + tagline; app launches straight to editor. Missing one-time "Make pixel art. Keep it local." card (skippable per Riley UX.md).
- **Update entry only in File menu.** `helpMenuCheckForUpdates` copy exists in `copy.ts` but no Help menu — Windows users often expect Help → About → Updates.
- **Install kind opaque.** User never sees whether update is portable vs system — matters when UAC/admin required.

### Suggestions (P2) — polish and delight

- Release notes link (GitHub release body) in `update_available` phase.
- Optional background check → non-blocking header dot / File menu badge (not modal).
- Platform-native "update ready" notification after download (Windows toast, macOS notification) when app in background.
- Installer art: Garden Frame icon + subtitle on DMG background / NSIS welcome — DESIGN.md marketing tier, OS-owned assets.

## Mistakes checklist (ux-seamless-flows)

- [x] Primary action obvious? — Install update / Restart now clear in `DialogFooter`
- [ ] State visible (loading/saved/error)? — Busy states yes; download % no; unsaved on restart no
- [x] Modals justified? — User-initiated check; appropriate
- [ ] Patterns consistent? — Linux elevation errors don't match planned Win/Mac patterns
- [x] Overwhelming on first visit? — No update nag on launch (good)
- [ ] Edge cases designed? — UAC, Gatekeeper, partial install, unsigned gaps
- [x] Hierarchy matches priority? — Dialog focused; canvas not blocked until user opens File menu
- [x] Beauty serves clarity? — Uses shared `Dialog` primitives

## Practices applied

| Practice | Status | Notes |
|----------|--------|-------|
| Golden path first | ⚠️ | Paint path solid; update path incomplete off Linux |
| One decision per step | ✅ | Check → install → restart |
| Progressive disclosure | ⚠️ | Commit SHA should move behind technical info |
| Immediate feedback | ⚠️ | Phases good; download needs progress |
| Forgiving (undo/autosave) | ❌ | Restart ignores unsaved state |
| Visual hierarchy | ✅ | Primary CTA correct; trust copy de-emphasized |
| Flow tested end-to-end | ❌ | Win/Mac not shippable yet |

## Agreed recommendations

| # | Item | Owner | Effort | Priority |
|---|------|-------|--------|----------|
| 1 | **Extend `updater.rs` + `InstallKind`** for `system_msi` / `user_windows`, `macos_app` (resolve `.exe`/`.msi`/`.dmg`/`.app.tar.gz` assets); keep single `UpdateDialog` API | eng | L | P0 |
| 2 | **Platform error components** in `UpdateDialog`: map `InstallResult`/errors to `copy.updateErrorUac`, `updateErrorGatekeeper`, `updateErrorPermission`, `updateErrorPartial` with primary "Open release page" (`variant="ghost"`) + Retry | ux + eng | M | P0 |
| 3 | **`restart_ready` save guard**: if unsaved, show inline warning + "Save project" primary before "Restart now"; disable restart until saved or explicit "Restart without saving" (destructive, rare) | ux + eng | S | P0 |
| 4 | **Trust block** in dialog (below description, `text-sm text-secondary`): "Downloads from github.com/pixelanea/pixelanea/releases. Your projects stay on this device." + link | ux | S | P0 |
| 5 | **Determinate download progress** — `updater_download_progress` event → `Progress` in dialog; fallback indeterminate | eng + ui | M | P1 |
| 6 | **Hide `mainCommit`** unless `showTechnicalInfo`; default copy: "You're on v{current}. Latest is v{latest}." | ux | S | P1 |
| 7 | **First-run welcome** (`WelcomeCard.tsx` or extend `SkippableOverlay`): subtitle + tagline + "Start drawing" / "Skip"; `localStorage` flag; never block canvas | ux + ui | M | P1 |
| 8 | **Help → About** submenu: version, "Check for updates…", link to user guide; mirrors File entry | ux + eng | S | P1 |
| 9 | **Signed release requirement** for public Win/Mac — document in release checklist; unsigned CI builds labeled "Developer build" in About | product + eng | L | P0 (release) |
| 10 | **Checksum display** when technical info on: SHA256 of downloaded asset | eng | M | P2 |

## Unsigned build UX risks

| Risk | Severity | User impact | Mitigation |
|------|----------|-------------|------------|
| Windows SmartScreen blocks unsigned EXE | 🔴 Red | Install never completes; Morgan support tickets | Authenticode signing; README "More info → Run anyway" only as interim |
| macOS Gatekeeper quarantine | 🔴 Red | "App can't be opened" on first launch | Notarize + staple; fallback help doc with `xattr` steps — not in-app for v1 |
| In-app binary swap without verification | 🔴 Red | Supply-chain trust gap | Sign releases; verify hash before apply; show hash when technical info on |
| GitHub-only download with no visible checksum | 🟡 Yellow | Savvy users hesitate | Trust block + optional SHA (rec #4, #10) |
| Generic "Could not install" on permission deny | 🟡 Yellow | User stuck, blames Pixelanea | Platform-specific errors (rec #2) |
| Large EXE with no progress | 🟡 Yellow | Appears frozen | Progress bar (rec #5) |

## Platform split: what Pixelanea owns vs OS

| Concern | macOS (DMG) | Windows (NSIS/MSI) | Linux (current) |
|---------|-------------|------------------|-----------------|
| Install location / shortcuts | OS (drag to Applications) | OS (wizard) | OS (`dpkg` / `install.sh`) |
| Security warnings | OS (Gatekeeper) | OS (SmartScreen, UAC) | OS (`pkexec`) |
| First-run welcome / Riley overlay | **Pixelanea** | **Pixelanea** | **Pixelanea** |
| In-app update UI | **Pixelanea** (`UpdateDialog`) | **Pixelanea** | **Pixelanea** |
| Update apply mechanics | Replace `.app` bundle or spawn signed helper | Elevated installer / MSI silent | `.deb` or tar overlay |
| Version / About | **Pixelanea** Help → About | **Pixelanea** Help → About | **Pixelanea** |
| Branding on disk image / wizard | OS asset (DMG background) | OS asset (NSIS banners) | `deb` control description |

**Principle:** Parity = **same dialog, same copy, same steps** (check → install → restart). Diverge only in **error recovery** and **silent install mechanics** per OS.

## Unresolved tension

**Maya** wants optional background update checks so Riley gets fixes without hunting File menu. **Leo** worries header badges add chrome noise and violate canvas-is-hero. **Compromise:** defer background check to P2; v1 stays user-initiated only. Revisit after signed Win/Mac ship.

## Files reviewed

- `apps/web/src/components/update/UpdateDialog.tsx`
- `apps/web/src/lib/desktop.ts`
- `apps/web/src/content/copy.ts`
- `apps/web/src/shell/AppHeader.tsx`
- `apps/web/src/shell/fileMenuItems.ts`
- `apps/web/src/shell/ViewMenu.tsx`
- `apps/web/src/shell/ConnectionBanner.tsx`
- `apps/desktop/src-tauri/src/updater.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/tauri.conf.json`
- `UX.md` (Riley, Morgan, onboarding rules)
- `DESIGN.md` (voice, installer/first-run naming, Dialog patterns)
- `docs/adr/0001-desktop-shell-tauri.md` (Windows signing estimate)

## References

- ux-seamless-flows skill (12 mistakes, top 10 practices)
- UX.md § Riley, Morgan, onboarding, zero-friction
- DESIGN.md § Brand voice, installer/first-run, Dialog elevation
- docs/adr/0001-desktop-shell-tauri.md § Windows parity, installer signing
