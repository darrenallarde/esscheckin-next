# Testing Conventions

## Tools

| Tool | Purpose | Command |
|------|---------|---------|
| Vitest | Unit & component tests | `npm run test:run` (CI) / `npm test` (watch) |
| Playwright | E2E browser tests | `npm run test:e2e` |
| Testing Library | DOM queries for React | Used inside Vitest tests |

## File Structure

```
__tests__/
  setup.ts              # RTL cleanup, global mocks
  smoke.test.ts         # Vitest smoke test
  lib/                  # Pure function tests
  hooks/                # Hook tests (renderHook)
  components/           # Component tests (render + fireEvent)
e2e/
  smoke.spec.ts         # Playwright smoke spec
  checkin.spec.ts       # Check-in flow E2E
  auth.spec.ts          # Login/OTP flow E2E
```

## What to Test

### Vitest (unit/component)
- Pure utility functions (formatters, validators, parsers)
- React hooks with `renderHook` (custom query hooks, mutation hooks)
- Component rendering and user interactions via Testing Library
- Form validation logic
- Data transformation functions

### Playwright (E2E)
- Critical user flows: check-in, login, devotional engagement
- Page loads and navigation
- Async Server Components (cannot be tested with Vitest/jsdom)

### Do NOT test
- Supabase RLS policies (test via SQL or manual)
- Third-party library internals
- Styling/layout (use visual regression tools if needed)

## TDD Workflow (/qa command)

1. Write a failing test that describes the expected behavior
2. Show the test to the user for approval
3. Implement the minimum code to make the test pass
4. Refactor if needed, keeping tests green

## Writing Vitest Tests

```ts
import { describe, expect, it } from "vitest";
import { myFunction } from "@/lib/my-module";

describe("myFunction", () => {
  it("returns expected output for valid input", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### Component tests

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## Writing Playwright Tests

```ts
import { expect, test } from "@playwright/test";

test("check-in flow works", async ({ page }) => {
  await page.goto("/checkin/ess");
  await page.getByPlaceholder("Search").fill("John");
  await expect(page.getByText("John Doe")).toBeVisible();
});
```

## Mocking Supabase

For unit tests that call Supabase, mock the client:

```ts
import { vi } from "vitest";

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

For E2E tests, use a real Supabase staging instance — no mocking.

## Environment

- Vitest uses `jsdom` environment (configured in `vitest.config.mts`)
- Path aliases (`@/`) resolve via `vite-tsconfig-paths`
- RTL `cleanup` runs after each test (configured in `__tests__/setup.ts`)
- Playwright auto-starts the dev server unless `PLAYWRIGHT_BASE_URL` is set

## CI Notes

- `npm run test:run` — non-interactive, exits with code 0/1
- `npm run test:e2e` — requires Chromium (installed via `npx playwright install chromium`)
- Screenshots on failure saved to `test-results/`
- Trace files saved on first retry to `test-results/`
