# Changelog

## Unreleased

### Added

- Native Linux desktop shell (`pixelanea-shell`) via Tauri 2 + WebKitGTK — primary launcher in `.deb` and app menu
- Browser fallback launcher (`pixelanea-browser`) for headless or WebKitGTK-missing environments
- Single-instance shell with `.pixelanea` file association (MIME + `pixelanea-open.desktop`)
- Port-in-use dialog (open existing instance, alternate port, or cancel)
- CI release builds for amd64 and arm64 `.deb`; portable `.tar.gz` includes `pixelanea-shell`
- Smoke tests: `scripts/test-package-linux.sh` (optional `--docker`), `scripts/test-desktop-shell.sh`

### Documentation

- Desktop install path in README, user guide, and workshop teacher guide (shell primary, browser fallback)
- ADR 0001 (Tauri shell), ADR 0002 (keep zenity file dialogs on server)
- Full documentation sweep: ARCHITECTURE, CONTRIBUTING, DEPENDENCIES, BACKLOG, docs/README, THIRD_PARTY_NOTICES, security-audit, PRACTICES

## v1.0.0 — 2026-08-01

### Added

- File → Export submenu: PNG, spritesheet, GIF animation
- Onion skin toggle in animation player
- Bundle-dirty status in status bar (unsaved when synced but not saved to disk)
- Desktop install path via `install-desktop-linux.sh`
- Workshop pilot protocol and export UX spec in `docs/`

### Fixed

- Re-open same `.pixelanea` closes server session before reload

### Documentation

- Consolidated `BACKLOG.md` for Sprint 2–4
- Security audit notes (`docs/security-audit.md`)
- MIT `LICENSE` and `THIRD_PARTY_NOTICES.md`
