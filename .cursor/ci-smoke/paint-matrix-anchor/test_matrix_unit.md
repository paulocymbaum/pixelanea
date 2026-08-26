# Paint matrix smoke anchor

Canonical Status-cell smoke for skill-output CI. All cases closed (`[x]` / `[-]`) so step 14 can verify the matrix parser without depending on gitignored `skill-outputs/` runs.

| ID | Case | Status | Notes |
|----|------|--------|-------|
| HP-001 | Anchor happy path | `[x]` | Smoke fixture — not live vitest |
| RACE-001 | Anchor race | `[-]` | Skipped in smoke anchor |
| EDGE-001 | Anchor edge | `[x]` | Smoke fixture |
| ERR-001 | Anchor error path | `[-]` | Skipped in smoke anchor |
