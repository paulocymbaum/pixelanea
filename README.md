# Pixelanea

**Make pixel art. Keep it local.**

Free, open-source, local-only pixel art editor. Draw on a grid, pixelate photos, animate in 8/16/32 frames, and share a single `.pixelanea` project file — no accounts, subscriptions, or cloud required.

## See it in action

Demos use a real photo imported at 64×64, with procedural shadow shading and frame-by-frame horizontal animation (Select → Copy → Paste → nudge per frame).

| New blank project | Import & pixelate | Shadow + walk cycle |
|:---:|:---:|:---:|
| ![Start a blank canvas, paint, and save](docs/media/linkedin/blank-project.gif) | ![Import a photo through the wizard](docs/media/linkedin/import-capybara.gif) | ![Add shadows, select, and animate across frames](docs/media/linkedin/animation-walk.gif) |

Regenerate demos locally: `./scripts/record-linkedin-media.sh` (outputs GIFs only; video intermediates are not committed or packaged).

## Features

- **Two front doors** — start from a blank canvas or import an image through the pixelate wizard
- **Drawing tools** — paint, eraser, eyedropper, fill bucket, and line tool
- **Palette editor** — add/edit colors, presets (Retro, Gameboy, Monochrome), palette lock, procedural shading ramps (under **More tools**)
- **Undo / redo** — client-side command stack (500 steps) with Ctrl+Z / Ctrl+Shift+Z
- **Animation** — duplicate to 8/16/32 frames, frame copy/reorder, play/pause with FPS and loop
- **Project I/O** — native file pickers for save/open; asset types (Character, Prop, Background, Animation)
- **Save trust** — status bar shows saved / unsaved / saving; connection banner when the API is unreachable
- **Export** — File → Export: PNG (current frame), spritesheet (all frames), GIF animation
- **Animation aids** — onion skin toggle when working with multiple frames
- **Themes** — light/dark with OS preference; keyboard shortcuts overlay (`?`)
- **Accessibility** — icon + label tools, focus rings, `prefers-reduced-motion`

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, TypeScript, Tailwind (`apps/web`) |
| Backend | C++17, cpp-httplib, SQLite (`server/`) |
| Desktop shell | Tauri 2 + WebKitGTK (`apps/desktop/`) |
| Contract | OpenAPI → TypeScript client (`contracts/`, `packages/api-client`) |

## Install from the repository (terminal)

Build and install on your machine from a clone — no pre-built download required. For pre-built installers, see [Releases](https://github.com/pixelanea/pixelanea/releases).

```bash
git clone https://github.com/pixelanea/pixelanea.git
cd pixelanea
```

Set the version once (used in paths below):

```bash
VERSION=$(tr -d '[:space:]' < VERSION)
```

Full toolchain details: [DEPENDENCIES.md](./DEPENDENCIES.md).

### Linux (Debian / Ubuntu)

**Native app (`.deb`, system-wide)** — recommended. Installs `pixelanea-shell` (Tauri + WebKitGTK). Launch from the app menu or run `pixelanea` / `pixelanea-shell`.

```bash
# One-time: Node 20+, pnpm, and native shell build dependencies
corepack enable && corepack prepare pnpm@9.15.4 --activate
sudo apt install dpkg-dev curl git build-essential cmake g++ ninja-build pkg-config
./scripts/install-desktop-shell-build-deps.sh

# Rust (if needed): https://rustup.rs
# cargo install tauri-cli --version 2.0.0 --locked

# Build the .deb and install it
./scripts/package-deb.sh
ARCH=$(dpkg-architecture -qDEB_BUILD_ARCH 2>/dev/null || echo amd64)
sudo apt install "./dist/pixelanea_${VERSION}_${ARCH}.deb"

pixelanea-shell
```

Optional: `sudo apt install zenity` for native File Open/Save dialogs. If `apt` reports dependency errors: `sudo apt-get install -f`.

**Browser launcher (user install, no root, no Rust)** — opens the editor in your default browser at `http://127.0.0.1:8787`:

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
sudo apt install curl git build-essential cmake g++ ninja-build
./scripts/install-desktop-linux.sh
pixelanea
```

**Portable folder (no install)** — extract and run, or install to `~/.local`:

```bash
./scripts/package-desktop-linux.sh
LINUX_ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
tar -xzf "dist/pixelanea-${VERSION}-linux-${LINUX_ARCH}.tar.gz" -C dist
cd "dist/pixelanea-${VERSION}-linux-${LINUX_ARCH}"
./pixelanea-shell          # native window
# or: ./install.sh         # copies to ~/.local and adds menu entry
```

### macOS

**DMG installer + portable `.app` zip** — requires macOS host, Xcode Command Line Tools, Rust, and Tauri CLI.

```bash
# One-time: Xcode CLT
xcode-select --install

corepack enable && corepack prepare pnpm@9.15.4 --activate
# Rust: https://rustup.rs

MAC_ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')

./scripts/package-dmg.sh

# Install from DMG (GUI)
open "dist/pixelanea-${VERSION}-macos-${MAC_ARCH}.dmg"

# Or install from terminal
MOUNT=$(mktemp -d)
hdiutil attach -nobrowse -mountpoint "$MOUNT" "dist/pixelanea-${VERSION}-macos-${MAC_ARCH}.dmg"
cp -R "$MOUNT/Pixelanea.app" /Applications/
hdiutil detach "$MOUNT"
open -a Pixelanea
```

Portable (no install): unzip `dist/pixelanea-${VERSION}-macos-${MAC_ARCH}.zip` and open `Pixelanea.app`.

On Apple Silicon use `arm64` in the filename; on Intel Mac use `x64`. Unsigned builds may need **System Settings → Privacy & Security** approval on first launch.

### Windows

**NSIS installer + portable zip** — Windows 10/11 x64, Visual Studio 2022 (Desktop development with C++), Git for Windows, Rust, WebView2.

```powershell
# One-time: enable pnpm (in PowerShell)
corepack enable
corepack prepare pnpm@9.15.4 --activate

# Build installer + portable zip (bootstraps vcpkg if VCPKG_ROOT is unset)
.\scripts\package-windows.ps1

# Install (GUI installer)
.\dist\pixelanea-$((Get-Content -Raw VERSION).Trim())-windows-x64-setup.exe

# Portable (no install)
Expand-Archive -Force "dist\pixelanea-$((Get-Content -Raw VERSION).Trim())-windows-x64.zip" "$env:LOCALAPPDATA\Pixelanea"
cd "$env:LOCALAPPDATA\Pixelanea\pixelanea-$((Get-Content -Raw VERSION).Trim())-windows-x64"
.\pixelanea-shell.exe
```

Unsigned installers may trigger SmartScreen — choose **More info → Run anyway** for local builds.

### pnpm shortcuts (Linux)

| Command | What it does |
|---------|----------------|
| `pnpm package:deb` | Build `.deb` → `dist/` |
| `pnpm package:desktop` | Build portable `tar.gz` → `dist/` |
| `pnpm install:desktop` | User-level browser launcher (`install-desktop-linux.sh`) |

See [docs/user-guide.md](./docs/user-guide.md) and [docs/workshop/teacher-guide.md](./docs/workshop/teacher-guide.md) for classroom setup.

## Developer quick start

**Prerequisites:** Node 20+, pnpm 9+, CMake, C++17 compiler, vcpkg — see [DEPENDENCIES.md](./DEPENDENCIES.md).

```bash
pnpm install
pnpm generate:api
pnpm dev
```

| Service | URL |
|---------|-----|
| Web UI (developer) | http://localhost:5173 |
| API health | http://127.0.0.1:8787/api/health |
| Desktop app (browser launcher) | http://127.0.0.1:8787 (after `install-desktop-linux.sh`) |
| Desktop app (native shell) | `pixelanea-shell` / app menu after `.deb` install |

**Sample projects** for testing File → Open: [`examples/projects/`](./examples/projects/) (blank canvas, sprites, animations).

## Tests

```bash
# Fast feedback (seconds–minutes)
pnpm lint              # ESLint (web) + C++ layer boundaries
pnpm lint:cpp          # C++ architecture boundaries only
pnpm typecheck
pnpm test:unit
pnpm test:qa

# Full smoke gate (install, build, live server checks)
pnpm test:smoke
pnpm test:smoke:frontend   # frontend smoke only
pnpm test:smoke:backend    # backend smoke only

# Desktop packaging
pnpm test:package:linux    # .deb structure (+ optional --docker)
pnpm test:desktop-shell    # shell subprocess smoke

# Backward-compatible aliases
pnpm test                  # same as test:smoke

# Playwright E2E (@smoke + @routing — requires Chromium)
pnpm test:e2e:install   # first time only
pnpm test:e2e

# Full CI gate (same as GitHub Actions build job)
./scripts/ci.sh              # full profile (all 13 steps)
./scripts/ci.sh profiles       # hook-commit | hook-push | fast | core | e2e | full | sprint
./scripts/ci.sh hook-commit    # pre-commit hook profile
./scripts/ci.sh hook-push      # pre-push hook profile
./scripts/ci.sh 08-build-server

# pnpm aliases
pnpm ci:fast
pnpm ci:core                 # full local gate (same steps as hook-commit + hook-push)
pnpm ci:e2e

# Sprint gate (subset — see scripts/ci-steps/README.md)
./scripts/ci-sprint1.sh      # same as ./scripts/ci.sh sprint
```

CI runs `typecheck`, `lint`, `test:qa`, `test:unit`, backend tests, smoke scripts, and **desktop packaging** (`.deb`, DMG, Windows installer) on every PR — see [`.github/workflows/build.yml`](.github/workflows/build.yml). Mirror locally: `./scripts/ci.sh`. Playwright E2E is optional (`pnpm ci:e2e`). Tagged releases upload the same artifacts to GitHub Releases — see [`.github/workflows/release.yml`](.github/workflows/release.yml).

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/AGENTS.md](./docs/AGENTS.md) | Agent workflows, skills, rules, and spec index |
| [docs/user-guide.md](./docs/user-guide.md) | End-user walkthrough |
| [docs/shortcuts.md](./docs/shortcuts.md) | Keyboard shortcuts reference |
| [docs/workshop/teacher-guide.md](./docs/workshop/teacher-guide.md) | Classroom workshop guide |
| [docs/adr/](./docs/adr/) | Architecture decision records |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and layer boundaries |
| [UX.md](./UX.md) | User flows and personas |
| [DESIGN.md](./DESIGN.md) | UI tokens and layout |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Install and dependency pinning |
| [BACKLOG.md](./BACKLOG.md) | Active roadmap and done items |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |

## Project layout

```text
pixelanea/
├── apps/
│   ├── web/               # React editor
│   └── desktop/           # Tauri shell (pixelanea-shell)
├── server/                # C++ API + SQLite + bundle I/O
├── contracts/             # OpenAPI spec
├── packages/api-client/   # Generated TS client
├── e2e/                   # Playwright E2E specs
├── examples/projects/     # Sample .pixelanea files for File → Open
├── brand/                 # Logo and color assets
├── docs/                  # User, workshop, and ADR guides
└── scripts/
    ├── dev.sh             # Start API + Vite with proxy
    ├── build-desktop-shell.sh
    ├── package-deb.sh         # Debian installer
    ├── package-dmg.sh         # macOS DMG + portable zip
    ├── package-windows.ps1    # Windows NSIS + portable zip
    ├── package-desktop-linux.sh
    ├── ci.sh              # CI orchestrator (profiles + per-step)
    ├── ci-lib.sh          # shared CI helpers
    ├── ci-steps/          # 13 observable CI steps (+ README)
    ├── ci-sprint1.sh      # delegates to ci.sh sprint
    └── e2e-webserver.sh   # Stack for Playwright
```

## Status

Core editor, export, animation, and **Linux desktop shell** (Tauri + `.deb`) are complete on `main` — see [CHANGELOG.md](./CHANGELOG.md) Unreleased. Active post-v1 work (Windows shell, workshop PDF kit) is tracked in [BACKLOG.md](./BACKLOG.md).

## License

License: MIT — see [LICENSE](./LICENSE).
