# Pixelanea Dependencies

This document lists all dependencies for the Pixelanea monorepo and explains how to install, pin, and update them. Pixelanea uses **two independent dependency systems**:

| Layer | Manager | Manifest | Lockfile |
|-------|---------|----------|----------|
| Frontend (`apps/web`, `packages/*`) | **pnpm** | `package.json` | `pnpm-lock.yaml` |
| Backend (`server/`) | **vcpkg** + **CMake** | `vcpkg.json`, `CMakeLists.txt` | `vcpkg-lock.json` (optional) |
| API contract | **OpenAPI Generator** | `contracts/openapi.yaml` | Generated code (not committed, or committed—see below) |

There is no shared package manager across C++ and TypeScript. The **contract** (`contracts/openapi.yaml`) is the bridge between frontend and backend.

See also: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Prerequisites (system-level)

Install these once per development machine. Versions listed are minimum tested targets.

| Tool | Version | Used by | Install |
|------|---------|---------|---------|
| **Node.js** | ≥ 20 LTS | Frontend, codegen scripts | [nodejs.org](https://nodejs.org/) or `nvm` |
| **pnpm** | ≥ 9 | Frontend workspace | `corepack enable && corepack prepare pnpm@latest --activate` |
| **CMake** | ≥ 3.24 | C++ build | `apt install cmake` / `brew install cmake` |
| **C++ compiler** | C++17+ | Backend | GCC 11+, Clang 14+, or MSVC 2022 |
| **Git** | any recent | vcpkg, submodules | system package manager |
| **vcpkg** | latest | C++ libraries | clone + `VCPKG_ROOT` env var |
| **pkg-config** | any | some native libs (optional) | `apt install pkg-config` |

### Optional (recommended)

| Tool | Purpose |
|------|---------|
| **ninja** | Faster C++ builds (`cmake -G Ninja`) |
| **ccache** | C++ compile caching |
| **OpenAPI Generator CLI** | Generate TS client from `contracts/openapi.yaml` |
| **Docker** | Reproducible CI/dev environment |

---

## Repository dependency map

```text
pixelanea/
├── package.json                 # Root workspace scripts (optional)
├── pnpm-workspace.yaml          # Frontend workspace definition
├── pnpm-lock.yaml               # Pinned JS/TS dependency tree
├── apps/web/package.json        # React app dependencies
├── packages/api-client/         # Generated + thin wrapper (depends on web)
├── contracts/openapi.yaml       # API contract (no deps; source of truth)
└── server/
    ├── CMakeLists.txt           # C++ targets + find_package / FetchContent
    ├── vcpkg.json               # Declarative C++ dependencies
    └── vcpkg-configuration.json # vcpkg registry + baseline (optional)
```

---

## Frontend dependencies (`apps/web`)

Managed with **pnpm** inside a workspace. Run all commands from the repo root unless noted.

### Runtime dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `react` | UI framework | Editor shell, panels, state |
| `react-dom` | DOM renderer | Required by React |
| `zustand` | Client state | Editor store: tool, color, frame, undo stack |
| `@pixelanea/api-client` | Typed API | Workspace package; generated from OpenAPI |

### Development dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `vite` | Dev server + bundler | Proxies `/api` → C++ backend |
| `@vitejs/plugin-react` | React HMR | Fast refresh in dev |
| `typescript` | Type checking | Strict mode recommended |
| `@types/react` | React types | |
| `@types/react-dom` | React DOM types | |
| `eslint` | Linting | |
| `@eslint/js` | ESLint flat config | |
| `typescript-eslint` | TS-aware lint rules | |
| `eslint-plugin-react-hooks` | Hooks lint rules | |
| `eslint-plugin-react-refresh` | Vite HMR safety | |
| `prettier` | Formatting | Optional but recommended |

### Codegen dependencies (dev)

| Package | Purpose | Notes |
|---------|---------|-------|
| `@openapitools/openapi-generator-cli` | TS client generation | Run after `contracts/openapi.yaml` changes |
| `openapi-typescript` | Alternative lightweight codegen | Optional; smaller output than full generator |

### Intentionally omitted (keep the stack lean)

| Package | Why omitted |
|---------|-------------|
| Redux | Zustand is enough for editor state |
| Axios | Native `fetch` + generated client |
| Canvas libraries (Pixi, Konva) | HTML Canvas 2D is sufficient for MVP |
| UI kits (MUI, Chakra) | Custom pixel-art UI; smaller bundle |

### Example `apps/web/package.json`

```json
{
  "name": "@pixelanea/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "generate:api": "openapi-generator-cli generate -i ../../contracts/openapi.yaml -g typescript-fetch -o ../../packages/api-client/src/generated"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "@pixelanea/api-client": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

---

## Backend dependencies (`server/`)

Managed with **vcpkg** (preferred) and declared in `server/vcpkg.json`. CMake resolves them via `find_package` or `FetchContent` for header-only libs.

### Core runtime libraries

| Library | vcpkg port | Purpose | License |
|---------|------------|---------|---------|
| **SQLite 3** | `sqlite3` | Per-project database | Public domain |
| **cpp-httplib** | `cpp-httplib` | Local HTTP REST server | MIT |
| **nlohmann-json** | `nlohmann-json` | JSON request/response bodies | MIT |
| **libzip** | `libzip` | `.pixelanea` ZIP bundle pack/unpack | BSD |
| **zlib** | `zlib` | Compression (libzip dependency) | zlib |
| **OpenSSL** or **BoringSSL** | `openssl` | SHA-256 checksums (optional; can use standalone impl) | Apache 2.0 |

### Image processing (header-only, vendored or FetchContent)

| Library | Integration | Purpose | License |
|---------|-------------|---------|---------|
| **stb_image** | `FetchContent` or `third_party/stb` | Decode PNG/JPEG/BMP | MIT |
| **stb_image_resize** | same | Downscale for pixelation | MIT |

These are typically **not** installed via vcpkg; copy headers into `server/third_party/` or pull with CMake `FetchContent` for reproducible pins.

### Optional backend libraries

| Library | When to add |
|---------|-------------|
| **spdlog** | Structured logging in dev/debug builds |
| **Catch2** or **Google Test** | Unit/integration tests |
| **lz4** | Faster frame blob compression than raw RLE |
| **uuid** (`stduuid` or `libuuid`) | Project ID generation |
| **OpenCV** | Advanced image filters (heavy; avoid for MVP) |

### Example `server/vcpkg.json`

```json
{
  "name": "pixelanea-server",
  "version-string": "1.0.0",
  "dependencies": [
    "sqlite3",
    "cpp-httplib",
    "nlohmann-json",
    "libzip",
    {
      "name": "openssl",
      "platform": "!windows | windows"
    }
  ],
  "builtin-baseline": "2024.12.12"
}
```

### Example `server/CMakeLists.txt` (dependency section)

```cmake
cmake_minimum_required(VERSION 3.24)
project(pixelanea-server CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(unofficial-sqlite3 CONFIG REQUIRED)
find_package(httplib CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(libzip CONFIG REQUIRED)

# stb (header-only)
include(FetchContent)
FetchContent_Declare(
  stb
  GIT_REPOSITORY https://github.com/nothings/stb.git
  GIT_TAG        master
  GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(stb)

add_executable(pixelanea-server src/main.cpp ...)
target_link_libraries(pixelanea-server PRIVATE
  unofficial::sqlite3::sqlite3
  httplib::httplib
  nlohmann_json::nlohmann_json
  libzip::zip
)
target_include_directories(pixelanea-server PRIVATE ${stb_SOURCE_DIR})
```

---

## Shared / cross-cutting dependencies

### OpenAPI contract (`contracts/`)

| Artifact | Role |
|----------|------|
| `contracts/openapi.yaml` | Single source of truth for REST API |
| `packages/api-client/` | Generated TypeScript types + fetch client |
| C++ handlers | Manually kept in sync (or generate stubs with `openapi-generator` C++ server, optional) |

**Workflow when the API changes:**

1. Edit `contracts/openapi.yaml`
2. Regenerate frontend client: `pnpm --filter @pixelanea/web generate:api`
3. Update C++ route handlers in `server/src/api/`
4. Run integration tests

**Codegen commit policy (pick one and document in README):**

| Policy | Pros | Cons |
|--------|------|------|
| **Commit generated TS** | CI doesn't need generator; clones work offline | Noisy diffs on API changes |
| **Generate in CI** | Clean repo | CI must install generator every build |

Recommended for Pixelanea: **commit generated client** until the API stabilizes.

---

## How to install dependencies

### First-time setup (full stack)

```bash
# 1. Clone and enter repo
git clone <repo-url> pixelanea && cd pixelanea

# 2. Install vcpkg (once per machine)
git clone https://github.com/microsoft/vcpkg.git ~/.vcpkg
~/.vcpkg/bootstrap-vcpkg.sh
export VCPKG_ROOT=~/.vcpkg

# 3. Frontend
corepack enable
pnpm install

# 4. Generate API client (after openapi.yaml exists)
pnpm --filter @pixelanea/web generate:api

# 5. Backend
cmake -S server -B server/build \
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" \
  -DCMAKE_BUILD_TYPE=Debug
cmake --build server/build
```

### Frontend only

```bash
pnpm install                  # install all workspace packages
pnpm --filter @pixelanea/web dev   # start Vite (needs backend for API calls)
```

### Backend only

```bash
export VCPKG_ROOT=~/.vcpkg
cmake -S server -B server/build \
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake"
cmake --build server/build
./server/build/pixelanea-server
```

---

## How to manage dependencies

### Frontend (pnpm)

| Task | Command |
|------|---------|
| Add runtime dep | `pnpm --filter @pixelanea/web add <package>` |
| Add dev dep | `pnpm --filter @pixelanea/web add -D <package>` |
| Update all (within ranges) | `pnpm update -r` |
| Update one package | `pnpm --filter @pixelanea/web update <package>` |
| Audit vulnerabilities | `pnpm audit` |
| Why is X installed? | `pnpm why <package>` |
| Clean reinstall | `rm -rf node_modules && pnpm install` |

**Pinning strategy:**

- Use **caret ranges** (`^`) in `package.json` for non-breaking updates
- Rely on **`pnpm-lock.yaml`** for exact reproducible installs
- Commit `pnpm-lock.yaml` to version control always
- Run `pnpm audit` in CI

**Workspace root `pnpm-workspace.yaml`:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Backend (vcpkg + CMake)

| Task | Command / action |
|------|------------------|
| Add library | Add port name to `server/vcpkg.json`, reconfigure CMake |
| Pin vcpkg baseline | Set `builtin-baseline` in `vcpkg.json` to a commit hash from [vcpkg commits](https://github.com/microsoft/vcpkg/commits/master) |
| Update one port | Bump baseline or run `vcpkg upgrade` in manifest mode |
| Clean rebuild | `rm -rf server/build && cmake ... && cmake --build ...` |
| List installed | `vcpkg list` |

**Pinning strategy:**

- **`vcpkg.json` `builtin-baseline`** pins the entire vcpkg registry snapshot
- Commit `vcpkg.json` (and `vcpkg-configuration.json` if used)
- For header-only vendored libs (stb), pin **`GIT_TAG`** to a specific commit in `FetchContent`, not `master`
- Optionally commit **`vcpkg-lock.json`** (vcpkg manifest lock) for stricter reproducibility

**vcpkg vs Conan (choose one):**

| Manager | Best for |
|---------|----------|
| **vcpkg** (recommended) | CMake-first projects, good Windows/Linux/macOS support |
| **Conan** | Teams already on Conan Center, complex transitive graphs |

Pixelanea standardizes on **vcpkg** per [ARCHITECTURE.md](./ARCHITECTURE.md).

### Keeping frontend and backend in sync

There is no automated cross-language dependency resolver. Sync happens at the **API contract** level:

```text
contracts/openapi.yaml  →  packages/api-client (generated)
                        →  server/src/api/     (hand-written, must match)
```

Add a CI check:

```bash
# Regenerate and fail if diff (optional)
pnpm generate:api && git diff --exit-code packages/api-client/
```

---

## Version matrix (target)

Use this as the canonical version target when scaffolding. Adjust as the project matures.

| Component | Target version |
|-----------|----------------|
| Node.js | 20.x LTS |
| pnpm | 9.x |
| React | 19.x |
| Vite | 6.x |
| TypeScript | 5.7+ |
| CMake | 3.24+ |
| C++ standard | C++17 (C++20 optional) |
| SQLite | 3.45+ (via vcpkg) |
| cpp-httplib | 0.15+ |
| nlohmann-json | 3.11+ |
| libzip | 1.10+ |
| OpenAPI | 3.1 |

---

## Platform-specific notes

### Linux

```bash
sudo apt install build-essential cmake ninja-build pkg-config
# vcpkg may need additional libs for openssl:
sudo apt install libssl-dev
```

### macOS

```bash
xcode-select --install
brew install cmake ninja pkg-config openssl
export VCPKG_ROOT=~/.vcpkg
```

### Windows

- Use **Visual Studio 2022** with "Desktop development with C++"
- vcpkg integrates via `CMAKE_TOOLCHAIN_FILE`
- Prefer **static linking** triplet for single-binary distribution: `x64-windows-static`

```bash
cmake -S server -B server/build \
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" \
  -DVCPKG_TARGET_TRIPLET=x64-windows-static
```

---

## CI dependency caching

| Layer | Cache key | Path |
|-------|-----------|------|
| pnpm | `pnpm-lock.yaml` hash | `~/.pnpm-store`, `node_modules` |
| vcpkg | `vcpkg.json` baseline hash | `$VCPKG_ROOT/installed`, `server/build` |
| ccache | compiler hash | `~/.ccache` |

Example GitHub Actions cache steps:

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm

- name: Cache vcpkg
  uses: actions/cache@v4
  with:
    path: ${{ env.VCPKG_ROOT }}/installed
    key: vcpkg-${{ hashFiles('server/vcpkg.json') }}
```

---

## Security and licensing

### Frontend

- Run `pnpm audit` regularly; fix high/critical issues before release
- Avoid packages with abandoned maintenance or unclear licenses
- No runtime dependency on CDN-hosted scripts (everything bundled by Vite)

### Backend

- Prefer well-audited libraries (SQLite, nlohmann-json, libzip)
- Validate and sandbox **imported user files** (images, `.pixelanea` bundles)—dependency security does not replace input validation
- Track licenses in `THIRD_PARTY_NOTICES.md` (generate from vcpkg + npm for releases)

### License compatibility (all permissive for MIT project)

| Library | License | OK for MIT project |
|---------|---------|-------------------|
| React | MIT | Yes |
| SQLite | Public domain | Yes |
| cpp-httplib | MIT | Yes |
| stb | MIT | Yes |
| libzip | BSD-3-Clause | Yes |
| OpenSSL | Apache 2.0 | Yes (attribution required) |

---

## Updating dependencies (recommended cadence)

| Layer | Cadence | Process |
|-------|---------|---------|
| Frontend patch/minor | Monthly | `pnpm update -r`, run tests + manual smoke test |
| Frontend major (React, Vite) | Per release cycle | Read migration guides, update in a branch |
| vcpkg baseline | Quarterly | Bump `builtin-baseline`, full rebuild + test |
| stb / vendored headers | When needed | Pin new `GIT_TAG`, verify image import |
| OpenAPI breaking changes | Coordinated | Version API (`/api/v1`), migrate both sides |

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| `find_package(sqlite3) failed` | vcpkg not wired | Pass `-DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake` |
| Frontend 404 on `/api` | Vite proxy missing | Add proxy in `vite.config.ts` → `http://127.0.0.1:8787` |
| Generated client out of date | API changed | `pnpm generate:api` |
| vcpkg build slow | Cold cache | Enable CI cache; use `ninja` generator |
| C++ link errors on Windows | Triplet mismatch | Use consistent `VCPKG_TARGET_TRIPLET` |
| `pnpm` vs `npm` conflict | Wrong manager | Always use `pnpm` in this repo; add `"packageManager": "pnpm@9.x"` to root `package.json` |

---

## Future dependencies (not required for MVP)

| Addition | Package / library | Trigger |
|----------|-------------------|---------|
| Desktop shell | Tauri 2.x (`@tauri-apps/api`) | Native window + single installer |
| E2E tests | Playwright | Full editor flow automation |
| GIF export | `gifenc` (C) or server-side encoder | Animation export feature |
| WASM pixelation | Emscripten + stb in browser | Offline mode without C++ server |
| Monorepo orchestration | Turborepo | Parallel builds across apps/packages |

---

## Quick reference

```bash
# Install everything
pnpm install
cmake -S server -B server/build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
cmake --build server/build

# Add frontend dependency
pnpm --filter @pixelanea/web add <pkg>

# Add backend dependency
# → edit server/vcpkg.json, then reconfigure CMake

# Regenerate API client
pnpm --filter @pixelanea/web generate:api

# Start development
./scripts/dev.sh
```
