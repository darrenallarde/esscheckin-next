---
name: qa
description: Test-driven development workflow
user-invocable: true
---

# /qa — Test-driven development workflow

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Use this when building a feature or fixing a bug with TDD. Argument: `$ARGUMENTS` (what to build/fix)

## Step 0: Decide What to Test

Read `docs/claude/testing.md` decision matrix. Not everything needs a unit test:

| Code Type                                                    | Test?                                     |
| ------------------------------------------------------------ | ----------------------------------------- |
| Pure functions, state machines, scoring, validators, parsers | **Vitest TDD (always)**                   |
| UI components with complex logic                             | Extract logic to pure function → TDD that |
| React Query hooks (thin Supabase wrappers)                   | **Skip** — E2E or manual                  |
| UI components (rendering only)                               | **Skip** — E2E or manual                  |
| Server Components                                            | **Playwright E2E only**                   |

## Step 1: Run Existing Tests First

```bash
npm run test:run
```

Know the baseline. If tests are already broken, fix them before writing new ones.

## Step 2: Write Failing Tests (RED)

Create test file in `__tests__/lib/` mirroring source path. Use these patterns:

- **Helper factories** for readable setup: `stateAt("round_play", { currentRound: 2 })`, `makeGame({ status: "active" })`
- **Test every input × every valid state** systematically (the matrix approach)
- **Test boundary values**: min, max, null, empty, off-by-one
- **Test error paths**: `expect(() => fn(bad)).toThrow()`
- **Test invalid operations are no-ops**: reducer returns same state
- **Inject time** as a parameter for time-dependent logic (never use `Date.now()` in tests)
- **Discriminated unions**: narrow with `if (result.success)` before asserting data fields
- **End with a full happy-path integration test** that walks through the entire flow

Run `npm run test:run` — confirm they fail (RED).

## Step 3: Get Approval

Show the failing tests. Explain what each covers. Wait for user confirmation.

## Step 4: Implement (GREEN)

Write the minimum code to make all tests pass. Run `npm run test:run` after each change.

**Never mock Supabase.** If the code calls Supabase, it's not a unit test candidate.

## Step 5: Verify

```bash
npm run test:run     # All green
npx tsc --noEmit     # Types clean
npm run build        # Build clean
```

## Step 6: Refactor (optional)

Clean up while tests stay green. Tests catch regressions.

## Step 7: Summary

Report: what was built, test count (should only go UP), edge cases not yet covered.

## Reference

Full patterns, anti-patterns, and checklist: `docs/claude/testing.md`
