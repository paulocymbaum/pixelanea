#!/usr/bin/env bash
# Sprint quality gate — subset of CI (typecheck, QA, unit, server, E2E).
# Prefer profiles: ./scripts/ci.sh sprint  or  pnpm ci:sprint
exec "$(dirname "${BASH_SOURCE[0]}")/ci.sh" sprint
