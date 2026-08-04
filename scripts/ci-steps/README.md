# CI step scripts

Each file is one observable gate. GitHub Actions runs them individually; locally use `./scripts/ci.sh`.

| Step | Script | What it checks |
|------|--------|----------------|
| 01 | `01-deps.sh` | `pnpm install` (hash cache) |
| 02 | `02-api-assets.sh` | OpenAPI codegen + api-client build |
| 03 | `03-lint.sh` | ESLint (web) + C++ layer boundaries |
| 04 | `04-typecheck.sh` | `tsc --noEmit` |
| 05 | `05-test-qa.sh` | Vitest QA matrices (`src/qa/`) |
| 06 | `06-test-unit.sh` | Vitest unit tests |
| 07 | `07-build-web.sh` | Vite production build |
| 08a | `08a-server-configure.sh` | FetchContent restore + cmake configure |
| 08b | `08b-server-compile.sh` | cmake build + verify binaries |
| 08 | `08-build-server.sh` | Wrapper: 08a + 08b |
| 09 | `09-test-backend-unit.sh` | `ctest` or `pixelanea_tests` fallback |
| 10 | `10-e2e-install.sh` | Playwright Chromium (`--with-deps` when `CI=true`) |
| 11 | `11-test-e2e.sh` | Playwright E2E (excl. LinkedIn media capture) |

On CI (`CI=true`), `e2e-webserver.sh` serves **prebuilt** `apps/web/dist` via `vite preview` (fast) instead of cold `vite dev`. Step 07 must run first.
| 12 | `12-smoke-backend.sh` | Live API smoke + lifecycle |
| 13 | `13-smoke-frontend.sh` | Static UI checks + Vite `/api` proxy |

Shared helpers live in `../ci-lib.sh`.

## Profiles (`./scripts/ci.sh <profile>`)

| Profile | Steps | Use when |
|---------|-------|----------|
| `fast` | 03–06 | Frontend-only edits; seconds–minutes |
| `core` | 01–02, 03–09 | Pre-push without E2E |
| `e2e` | 01–02, 03–11 | User flows before merge |
| `full` | 01–13 | Same as GitHub Actions `build` job |
| `sprint` | 04–06, 08–11 | Legacy sprint gate (no lint/smoke) |

```bash
./scripts/ci.sh list              # all step ids
./scripts/ci.sh fast              # profile
./scripts/ci.sh 08-build-server   # single step
./scripts/ci.sh 05-test-qa 06-test-unit
```

Steps 12–13 set `CI_SKIP_REDUNDANT=1` so smoke scripts skip checks already run in earlier steps.
