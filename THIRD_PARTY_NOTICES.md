# Third-party notices

Pixelanea bundles or depends on the following open-source components. See `server/third_party/`, `package.json` / `pnpm-lock.yaml`, and `apps/desktop/src-tauri/Cargo.lock` for pinned versions.

| Component | License | Use |
|-----------|---------|-----|
| React, Vite, TypeScript, Tailwind | MIT | Frontend |
| Radix UI | MIT | UI primitives |
| Tauri 2, tauri-plugin-* | MIT / Apache-2.0 | Linux desktop shell (`apps/desktop/`) |
| Rust crates (serde, ureq, etc.) | MIT / Apache-2.0 / BSD | Shell dependencies — see `Cargo.lock` |
| WebKitGTK | LGPL (system) | **Not bundled** — OS package on Linux (`libwebkit2gtk-4.1-0`) |
| cpp-httplib | MIT | HTTP server |
| SQLite | Public domain | Persistence |
| stb_image | MIT / Public domain | Image decode |
| gifenc (via gif_encoder) | MIT | GIF export |
| miniz | MIT | ZIP bundle I/O |
| Catch2 | BSL-1.0 | C++ tests |
| Playwright | Apache-2.0 | E2E tests |
| Vitest | MIT | Frontend tests |

Full license texts for vendored C++ libraries are in `server/third_party/` where required by upstream.

For the desktop shell, run `cargo license` in `apps/desktop/src-tauri/` to generate a full Rust dependency report when preparing a release.
