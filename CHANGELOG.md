# Changelog

## Unreleased

### Added

- Native Linux desktop shell (`pixelanea-shell`) via Tauri 2 + WebKitGTK — primary launcher in `.deb` and app menu
- Browser fallback launcher (`pixelanea-browser`) for headless or WebKitGTK-missing environments
- Single-instance shell with `.pixelanea` file association (MIME + `pixelanea-open.desktop`)
- Port-in-use dialog (open existing instance, alternate port, or cancel)
- CI release builds for amd64 and arm64 `.deb`; portable `.tar.gz` includes `pixelanea-shell`
- Smoke tests: `scripts/test-package-linux.sh` (optional `--docker`), `scripts/test-desktop-shell.sh`
- **Open existing** entry card on the new-project screen for Morgan template distribution
- Favicon set, PWA icons (`icon-192`, `icon-512`), and refreshed logo lockup / mark assets
- `.pixelanea` file-type icon in Linux file managers (grid glyph via `application-x-pixelanea` hicolor theme)
- Workshop teacher kit (E2-014): printable [facilitator one-pager](./docs/workshop/facilitator-one-pager.md) and [student handout](./docs/workshop/student-handout.md) PDFs under `docs/workshop/pdf/`

### Changed

- Route-level unsaved guard (Editor → Import) now offers **Save, then continue**, matching File-menu navigation — prevents data loss on import with dirty pixels
- Status bar surfaces **Not saved to file** when pixels are synced but the `.pixelanea` bundle on disk is stale (`bundleDirty`)
- Duplicate-frames tool rail control shows icon + visible label (Morgan projector readability)
- Canvas auto-focus on editor entry after project load
- Palette section rail shows abbreviated text labels at `≥1024px`; Shading/Filters tucked behind **More tools** expander on import entry
- Animation player layout wraps on narrow widths; zoom shortcut placeholders removed from shortcuts overlay

### Fixed

- E2E coverage: paint → Import → Save, then continue → wizard opens with work persisted (`e2e/routing.spec.ts`)
- E2E specs aligned with bundle-dirty status bar (`Not saved to file`) and palette More tools disclosure (`expandPaletteMoreTools`, `expectPixelsSyncedToServer` in `e2e/helpers.ts`)
- `scripts/e2e-playwright.sh` preserves `--grep` patterns with `|` when invoked via `pnpm test:e2e`

### Documentation

- Desktop install path in README, user guide, and workshop teacher guide (shell primary, browser fallback)
- ADR 0001 (Tauri shell), ADR 0002 (keep zenity file dialogs on server)
- Full documentation sweep: ARCHITECTURE, CONTRIBUTING, DEPENDENCIES, BACKLOG, docs/README, THIRD_PARTY_NOTICES, security-audit, PRACTICES

### Known limitations (v1 Linux)

- New-project screen uses two primary cards + inline animation hint (not three equal-weight paths)
- Windows desktop shell and code signing deferred post-v1

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
