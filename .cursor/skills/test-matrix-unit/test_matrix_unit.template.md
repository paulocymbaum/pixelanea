# Test matrix — {UNIT}

| Field | Value |
|-------|-------|
| **Scope** | {SCOPE} |
| **Feature** | {feature} |
| **Layer** | {layer} |
| **Created** | {YYYY-MM-DD} |
| **Last pass** | {YYYY-MM-DD HH:MM} |

## Cases

| ID | Category | Case | Preconditions | Steps | Expected | Status | Notes |
|----|----------|------|---------------|-------|----------|--------|-------|
| HP-001 | Happy path | Primary success flow | Default state; valid fixtures | 1. …<br>2. … | User-visible success; state persisted | `[ ]` | |
| HP-002 | Happy path | Secondary success path | … | 1. … | … | `[ ]` | |
| RACE-001 | Race | Rapid route change during load | Slow network mock | 1. Navigate to A<br>2. Before load completes, navigate to B | B renders; no stale A data | `[ ]` | |
| RACE-002 | Race | Overlapping async saves | Edits in flight | 1. Trigger save<br>2. Edit again before response | Latest edit wins; no corruption | `[ ]` | |
| EDGE-001 | Edge | Empty / minimal input | Zero items / blank project | 1. … | Graceful empty state; no crash | `[ ]` | |
| EDGE-002 | Edge | Boundary value | At max width/height/limit | 1. … | Accepted or validated message | `[ ]` | |
| ERR-001 | Error | API failure | Mock 500 on endpoint | 1. Perform action | User-facing error; recoverable | `[ ]` | |
| ERR-002 | Error | Validation rejection | Invalid payload | 1. Submit bad input | Inline or toast error; no partial persist | `[ ]` | |

## Pass summary

| Metric | Count |
|--------|------:|
| Total | 8 |
| Passed `[x]` | 0 |
| Failed `[!]` | 0 |
| Blocked `[~]` | 0 |
| Skipped `[-]` | 0 |
| Not run `[ ]` | 8 |

### Open failures

_(none)_

### Escalations

_(none)_
