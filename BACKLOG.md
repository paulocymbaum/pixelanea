# Pixelanea Backlog

Active and post-v1 work items. Historical sprint detail lives in [CHANGELOG.md](./CHANGELOG.md) and product notes under `.cursor/changelog/`.

## Done (v1 / unreleased)

- [x] Core editor MVP — canvas, tools, palette, undo, animation, export
- [x] Native Linux desktop shell (`pixelanea-shell`) via Tauri 2 + WebKitGTK
- [x] Debian `.deb` packaging and portable `.tar.gz` with shell primary, `pixelanea-browser` fallback
- [x] CI release builds (amd64 + arm64) — see [`.github/workflows/release.yml`](./.github/workflows/release.yml)
- [x] Workshop teacher guide and pilot protocol aligned with `.deb` install
- [x] ADR 0001 (Tauri shell), ADR 0002 (keep zenity file dialogs on server)

## Active — post-v1

### Distribution

- [ ] Windows desktop shell (Tauri) + NSIS installer
- [ ] Code signing for Windows releases (optional, budget-dependent)
- [ ] Authenticode / release signing documentation for facilitators

### Workshop & UX

- [ ] E2-014 — Workshop teacher kit (printable template + PDF handout)
- [ ] Download landing page (GitHub Releases vs curated page — product decision)

### Editor polish

- [ ] Onion skin visible by default when animation frames > 1 (currently feature-flagged)
- [ ] Spritesheet / GIF export enabled by default in shipping `features.ts` when release-ready

## Deferred

- snap / flatpak packages
- Auto-update channel
- Tauri-native file dialogs replacing zenity (see [docs/adr/0002-desktop-file-dialogs.md](./docs/adr/0002-desktop-file-dialogs.md))
- Cloud sync or accounts

## References

| Resource | Path |
|----------|------|
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Desktop shell ADR | [docs/adr/0001-desktop-shell-tauri.md](./docs/adr/0001-desktop-shell-tauri.md) |
| User install guide | [docs/user-guide.md](./docs/user-guide.md) |
| Workshop guide | [docs/workshop/teacher-guide.md](./docs/workshop/teacher-guide.md) |
