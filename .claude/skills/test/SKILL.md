---
name: test
description: Run diagnostics
user-invocable: true
---

# /test — Run diagnostics

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Run the full test suite and report results. Argument: `$ARGUMENTS` (optional: "unit", "e2e", or blank for all)

## Steps

1. **Typecheck:** Run `npm run typecheck`. Report any errors.
2. **Unit tests:** Run `npm run test:run`. Report pass/fail counts and any failures.
3. **E2E tests:** If `$ARGUMENTS` includes "e2e" or is blank, check if `e2e/` has `.spec.ts` files. If yes, run `npm run test:e2e`. Report results.
4. **Summary:** Present a table:

| Check | Status | Details |
|-------|--------|---------|
| Typecheck | PASS/FAIL | error count |
| Unit tests | PASS/FAIL | X passed, Y failed |
| E2E tests | PASS/FAIL/SKIP | X passed, Y failed |

If any step fails, show the relevant error output and suggest fixes. Do NOT auto-fix — present the issue and let the user decide.
