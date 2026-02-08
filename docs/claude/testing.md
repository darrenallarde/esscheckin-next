# Testing Strategy

## Tools

| Tool       | Purpose                    | Command                                      |
| ---------- | -------------------------- | -------------------------------------------- |
| Vitest     | Unit & pure function tests | `npm run test:run` (CI) / `npm test` (watch) |
| Playwright | E2E browser tests          | `npm run test:e2e`                           |

## Testing Decision Matrix

| Code Type                         | Test Strategy         | Why                                                  |
| --------------------------------- | --------------------- | ---------------------------------------------------- |
| Pure functions                    | Vitest TDD (always)   | Deterministic, fast, high ROI                        |
| State machines / reducers         | Vitest TDD (always)   | Core logic with complex branching — must be airtight |
| Validators / parsers              | Vitest TDD (always)   | Boundary values, error cases, security-critical      |
| React Query hooks (thin wrappers) | Skip unit test        | Just Supabase calls — mock soup gives false safety   |
| UI components (rendering only)    | Skip, cover via E2E   | Testing DOM output is fragile and low-value          |
| UI components with complex logic  | Vitest component test | Extract logic to pure function first if possible     |
| Server Components (page.tsx)      | Playwright E2E only   | jsdom can't handle async Server Components           |
| RLS policies                      | SQL scripts or manual | Need real database connection                        |
| Edge functions                    | Manual + integration  | Depend on Supabase runtime, external APIs            |

**Rule of thumb:** If it's pure logic, TDD it. If it touches the network or DOM, E2E it or skip it.

## TDD Workflow

Every pure function and state machine follows Red → Green → Refactor:

### 1. Red — Write a failing test first

```ts
it("calculates score as (201 - rank) * multiplier for high rounds", () => {
  expect(calculateScore({ rank: 5, direction: "high", multiplier: 2 })).toBe(
    392,
  );
});
```

Run `npm run test:run` — it should fail (function doesn't exist yet).

### 2. Green — Write the minimum code to pass

```ts
export function calculateScore({ rank, direction, multiplier }) {
  if (direction === "high") return (201 - rank) * multiplier;
  return rank * multiplier;
}
```

Run again — test passes.

### 3. Refactor — Clean up while tests stay green

Add edge cases, rename for clarity, optimize. Tests catch regressions.

### Real example from this codebase

The Hi-Lo game state machine (`src/lib/game/state-machine.ts`) was built entirely via TDD:

- Tests written first for every screen transition
- Invalid transitions verified as no-ops
- Resume from partial state tested before implementation
- 30+ tests covering every action × every valid screen

## What Makes a Good Unit Test

Lessons from the Hi-Lo game test suite (102 tests across 5 files):

1. **Test every action × every valid source screen** — `GAME_LOADED` from `loading`, `START_GAME` from `intro`, etc.
2. **Test invalid transitions are no-ops** — `START_GAME` from `round_play` returns same state
3. **Test boundary values** — rank 1, rank 200, rank null (not on list), round 4 (final)
4. **Test resume from partial state** — 0 rounds, 2 rounds, all 4 rounds
5. **Test accumulation** — scores adding up, rounds array growing
6. **Descriptive test names** — `"transitions from round_result to final_results after round 4"`
7. **Use helpers for readable setup** — `stateAt("round_play", { currentRound: 2 })` not raw object literals
8. **End with a full happy-path test** — Walk through the entire flow in one test as a capstone
9. **Test error paths explicitly** — `expect(() => fn(badInput)).toThrow()` for invalid inputs

## Test Helper Patterns

Helpers are critical for readable tests. Here are the patterns from our codebase:

### State factory — for reducers/state machines

```ts
function stateAt(
  screen: GameScreen,
  overrides: Partial<GameState> = {},
): GameState {
  return { ...initialState(), ...overrides, screen };
}
// Usage: stateAt("round_play", { currentRound: 2, authenticated: true })
```

### Record factory — for domain objects

```ts
function makeGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return { id: "test-id", status: "ready", opens_at: null, ...overrides };
}
// Usage: makeGame({ status: "active", opens_at: "2026-02-07T00:00:00Z" })
```

### Parameterized data factory — for bulk test data

```ts
function makeAnswers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    answer: `word${i + 1}`,
    rank: i + 1,
  }));
}
// Usage: makeAnswers(200) for valid set, makeAnswers(199) for invalid count
```

### Time injection — for deterministic time tests

```ts
// Function signature accepts `now` parameter:
function isGameOpen(game: GameRecord, now: Date = new Date()): boolean { ... }

// Test injects a fixed time:
const now = new Date("2026-02-07T12:00:00Z");
expect(isGameOpen(game, now)).toBe(true);
```

### Discriminated union narrowing — for result types

```ts
const result = parseResponse(raw);
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.answers).toHaveLength(200); // TypeScript knows data exists
}
```

## File Structure

```
__tests__/
  setup.ts              # Global test setup
  smoke.test.ts         # Vitest smoke test
  lib/                  # Pure function & state machine tests
  hooks/                # Hook tests (if needed — usually skip)
  components/           # Component tests (if complex logic)
e2e/
  *.spec.ts             # Playwright E2E specs
```

Test files mirror source structure: `src/lib/game/state-machine.ts` → `__tests__/lib/game-state-machine.test.ts`

## Playwright E2E Patterns

### File location & structure

```ts
// e2e/game.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Hi-Lo Game", () => {
  test("intro screen loads", async ({ page }) => {
    await page.goto("/g/test-game-id");
    await expect(page.getByText("Play Now")).toBeVisible();
  });
});
```

### Environment gating

For tests that need real data (games with 200 answers, etc.):

```ts
test.skip(!process.env.PLAYWRIGHT_GAME_ID, "No test game configured");
```

### Selectors

- Prefer `data-testid` for test-specific selectors
- Use `page.getByText()` and `page.getByRole()` for user-visible content
- Avoid CSS class selectors (fragile)

### Auth in E2E

If a flow requires authentication, use the devotional auth pattern or pre-seed a session cookie.

## Anti-Patterns — Do NOT Do These

### 1. Don't mock Supabase to test hooks

```ts
// BAD — mock soup that tests nothing real
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}));
```

This tests your mocks, not your code. If the hook is a thin Supabase wrapper, skip the unit test. Cover it via E2E with a real database.

### 2. Don't test rendering of simple components

```ts
// BAD — low value, breaks on every style change
it("renders a button with correct className", () => {
  render(<MyButton />);
  expect(screen.getByRole("button")).toHaveClass("bg-primary");
});
```

### 3. Don't test third-party library behavior

```ts
// BAD — testing React Query, not your code
it("returns isLoading true initially", () => {
  const { result } = renderHook(() => useMyQuery());
  expect(result.current.isLoading).toBe(true);
});
```

### 4. Don't write integration tests disguised as unit tests

If your test needs 5+ mocks to run, it's an integration test. Use Playwright instead.

## Testing Checklist

Before shipping any feature:

- [ ] Pure logic has Vitest TDD tests (state machines, validators, scoring functions)
- [ ] Critical user flow has E2E test or documented reason why manual-only
- [ ] `npm run test:run` passes
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean

## Environment

- Vitest uses `jsdom` environment (configured in `vitest.config.mts`)
- Path aliases (`@/`) resolve via `vite-tsconfig-paths`
- Playwright auto-starts the dev server unless `PLAYWRIGHT_BASE_URL` is set
- Screenshots on failure saved to `test-results/`
- Trace files saved on first retry to `test-results/`
