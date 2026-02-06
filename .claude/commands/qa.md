# /qa — Test-driven development workflow

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Use this when building a feature or fixing a bug with TDD. Argument: `$ARGUMENTS` (what to build/fix)

## Workflow

1. **Understand:** Parse `$ARGUMENTS`. Read relevant code and specs. Identify what behavior needs to be tested.
2. **Write failing tests:** Create or update test files in `__tests__/` (Vitest) or `e2e/` (Playwright) that describe the expected behavior. Run `npm run test:run` to confirm they fail.
3. **Get approval:** Show the failing tests to the user. Explain what each test covers. Wait for confirmation before implementing.
4. **Implement:** Write the minimum code to make all tests pass. Run `npm run test:run` after each change.
5. **Green check:** All tests pass. Run `npm run typecheck` to verify types.
6. **Refactor (optional):** If the code can be cleaner, refactor while keeping tests green.
7. **Summary:** Show what was built, what tests cover, and any edge cases not yet tested.

## Guidelines

- Prefer Vitest for pure functions, hooks, and components
- Use Playwright for full-page flows and async Server Components
- Mock Supabase in unit tests; use staging in E2E tests
- Reference: `docs/claude/testing.md`
- If unsure what to test, ask the user before writing tests
