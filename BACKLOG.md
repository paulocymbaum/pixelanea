# Pixelanea Backlog

Active and post-v1 work items. Historical sprint detail lives in [CHANGELOG.md](./CHANGELOG.md) and product notes under `.cursor/changelog/`.

## Done (v1 / unreleased)

- [x] Core editor MVP — canvas, tools, palette, undo, animation, export
- [x] Native Linux desktop shell (`pixelanea-shell`) via Tauri 2 + WebKitGTK
- [x] Debian `.deb` packaging and portable `.tar.gz` with shell primary, `pixelanea-browser` fallback
- [x] CI release builds (amd64 + arm64) — see [`.github/workflows/release.yml`](./.github/workflows/release.yml)
- [x] Workshop teacher guide and pilot protocol aligned with `.deb` install
- [x] ADR 0001 (Tauri shell), ADR 0002 (server FileDialogProvider: zenity / Win32 / osascript)

## Active — post-v1

### Distribution

- [x] Windows desktop shell (Tauri) + NSIS installer — CI `package-windows` job; see [docs/user-guide.md](./docs/user-guide.md#install-windows)
- [ ] Code signing for Windows releases (optional, budget-dependent)
- [ ] Authenticode / release signing documentation for facilitators

### Workshop & UX

- [x] E2-014 — Workshop teacher kit (printable template + PDF handout)
- [ ] Download landing page (GitHub Releases vs curated page — product decision)

### Editor polish

- [x] Onion skin visible by default when animation frames > 1 (store default; re-enabled on multi-frame load/duplicate)
- [x] Spritesheet / GIF export enabled by default in the File → Export menu

## Deferred

- snap / flatpak packages
- Auto-update **channel** (GitHub Releases productization + code signing) — desktop shell already has experimental updater IPC (`apps/desktop/src-tauri/src/updater.rs`); not shipping until signing + UX are ready
- Tauri-native file dialogs replacing server pickers (see [docs/adr/0002-desktop-file-dialogs.md](./docs/adr/0002-desktop-file-dialogs.md)) — revisit if the web app is embedded as Tauri `frontendDist`; OpenAPI pickers remain the contract
- Cloud sync or accounts

## References

| Resource | Path |
|----------|------|
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Desktop shell ADR | [docs/adr/0001-desktop-shell-tauri.md](./docs/adr/0001-desktop-shell-tauri.md) |
| User install guide | [docs/user-guide.md](./docs/user-guide.md) |
| Workshop guide | [docs/workshop/teacher-guide.md](./docs/workshop/teacher-guide.md) |
