# QA run — {scope title}

## Meta

| Field | Value |
|-------|-------|
| **Date** | {ISO date} |
| **Gherkin source** | `{path to gherkin.md}` |
| **Runner** | qa-gherkin-run |
| **Stack** | API `{port}` · Vite `{port}` · `{manual \| playwright \| vitest-qa}` |
| **Feature** | {feature} |

## Summary

| Flag | Count |
|------|------:|
| 🔴 Red | 0 |
| 🟡 Yellow | 0 |
| 🟢 Green | 0 |
| ⚪ White | 0 |

| Functional | Count |
|------------|------:|
| Pass | 0 |
| Fail | 0 |
| Skip / N/A | 0 |

**Feature rollup:** {red \| yellow \| green \| white}

## Prerequisites verified

- [ ] `./scripts/dev.sh` (or equivalent) running
- [ ] Health check `GET /health` OK
- [ ] Frontend loads at base URL
- [ ] Test fixtures prepared (blank 32×32, multi-frame, etc.)

## Scenario results

| Tag | Feature | Scenario | Matrix | Functional | Flag | UX notes |
|-----|---------|----------|--------|------------|------|----------|
| @smoke | … | … | HP-001 | pass | 🟢 | Golden path; save toast visible |
| @race | … | … | RACE-002 | pass | 🟡 | Flaky without 2s route delay |

## Red flags (detail)

_(none)_

## Yellow flags (detail)

_(none)_

## Green highlights

_(none)_

## White / skipped

| Scenario | Reason |
|----------|--------|
| … | unit-only per coverage table |

## UX mistakes spotted (ux-seamless-flows)

- [ ] 1 Primary action unclear
- [ ] 2 Hidden state
- [ ] 3 Flow break
- [ ] 4 Inconsistent patterns
- [ ] 5 Cognitive overload
- [ ] 6 Form friction
- [ ] 7 Weak hierarchy
- [ ] 8 Jargon
- [ ] 9 Accessibility
- [ ] 10 Happy path only
- [ ] 11 Beauty without function
- [ ] 12 No feedback loop

## Escalations

| Item | Delegate to |
|------|-------------|
| _(none)_ | |

## References

- [flag-rubric.md](flag-rubric.md)
- [ux-seamless-flows](../ux-seamless-flows/SKILL.md)
- Gherkin: `{path}`
