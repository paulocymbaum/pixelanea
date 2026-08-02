# Third-party notices

Pixelanea bundles or depends on the following open-source components. See `server/third_party/` and `package.json` / `pnpm-lock.yaml` for pinned versions.

| Component | License | Use |
|-----------|---------|-----|
| React, Vite, TypeScript, Tailwind | MIT | Frontend |
| Radix UI | MIT | UI primitives |
| cpp-httplib | MIT | HTTP server |
| SQLite | Public domain | Persistence |
| stb_image | MIT / Public domain | Image decode |
| gifenc (via gif_encoder) | MIT | GIF export |
| miniz | MIT | ZIP bundle I/O |
| Catch2 | BSL-1.0 | C++ tests |
| Playwright | Apache-2.0 | E2E tests |
| Vitest | MIT | Frontend tests |

Full license texts for vendored C++ libraries are in `server/third_party/` where required by upstream.
