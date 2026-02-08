---
name: new-feature
description: Plan and build a new feature
user-invocable: true
---

# /new-feature — Plan and build a new feature

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Use this when starting work on a new feature. Argument: `$ARGUMENTS` (feature description)

## Phase 1: Plan

1. **Understand the request:** Parse `$ARGUMENTS` for the feature description.
2. **Research:** Read relevant existing code, specs in `specs/`, and docs in `docs/`. Understand the current architecture.
3. **Write a plan:** Outline the approach — files to create/modify, database changes needed, components involved. Save to SCRATCHPAD.md if complex.
4. **Identify testable logic:** In the plan, tag which files contain pure logic (state machines, scoring, validators, parsers). These MUST get TDD tests. See `docs/claude/testing.md` decision matrix.
5. **Get approval:** Present the plan and wait for user confirmation before writing any code.

## Phase 2: Build

6. **Create branch:** `git checkout -b feature/<short-name>`
7. **Database first:** If the feature needs schema changes, use `/db-migrate` workflow.
8. **Run existing tests:** `npm run test:run` — know the baseline before writing anything.
9. **TDD the pure logic:** For every file tagged as testable in the plan:
   - Write failing tests FIRST (`__tests__/lib/`)
   - Show tests, get approval
   - Implement minimum code to pass
   - Refactor while green
     See `/qa` skill and `docs/claude/testing.md` for patterns (helper factories, boundary testing, matrix approach).
10. **Build the UI/hooks:** Components, hooks, and wiring that connect the tested logic to the UI. These don't need unit tests — they'll be covered by E2E or manual testing.
11. **Verify:** `npm run test:run` + `npx tsc --noEmit` + `npm run build` — all must pass.
12. **Review:** Show summary: what was built, test count (must go UP if pure logic was added), edge cases.
13. **Commit:** Commit with a clear message describing the feature.

Do not push — user decides when to ship with `/ship` or `/deploy`.
