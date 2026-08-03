# Security audit — v1.0 (E2-020)

**Date:** 2026-08-01  
**Scope:** Local-only attack surface for Sprint 2–4 launch gate.

## Findings

| Area | Status | Evidence |
|------|--------|----------|
| **Localhost bind** | PASS | `server/src/main.cpp` defaults to `127.0.0.1`; API not exposed on LAN |
| **Bundle path traversal** | PASS | `server/tests/bundle_io_test.cpp` — `bundle unpack rejects path traversal` |
| **Checksum validation** | PASS | Bundle I/O validates SHA-256 manifest entries |
| **Unsafe ZIP entries** | PASS | Rejected with plain error `bundleUnsafeEntry` (S1-912) |
| **OpenAPI surface** | PASS | No auth endpoints; no remote callbacks |
| **Shell WebView navigation** | PASS | `apps/desktop/src-tauri/src/lib.rs` — `on_navigation` allows only `127.0.0.1` / `localhost` |

## Residual risk (accepted)

- Local process can read/write user-chosen paths via native pickers — expected for a desktop art tool.
- No sandboxing of imported images — stb_image decode only; user trusts their own files.

## Follow-up (post-v1.0)

- Fuzz bundle unpack with malformed ZIPs.
- Optional CSP headers when serving `web/dist` from `pixelanea-server`.
- Review Tauri capability scope when adding new shell plugins.
