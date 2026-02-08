import { expect, test } from "@playwright/test";

const GAME_ID = process.env.PLAYWRIGHT_GAME_ID;

test.describe("Hi-Lo Game", () => {
  test.skip(!GAME_ID, "No test game configured (set PLAYWRIGHT_GAME_ID)");

  test("intro screen loads with game content", async ({ page }) => {
    await page.goto(`/g/${GAME_ID}`);

    // Should show the game intro screen
    await expect(page.getByText("Hi-Lo")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Play Now")).toBeVisible();
  });

  test("shows expired screen for non-existent game", async ({ page }) => {
    await page.goto("/g/00000000-0000-0000-0000-000000000000");

    // Should show error or expired state
    await expect(page.getByText(/not found|expired|unavailable/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("full game flow: play 4 rounds and see results", async ({ page }) => {
    await page.goto(`/g/${GAME_ID}`);

    // Wait for intro screen
    await expect(page.getByText("Play Now")).toBeVisible({ timeout: 10_000 });

    // Click Play Now
    await page.getByText("Play Now").click();

    // Handle auth screen if shown (enter a test name)
    const nameInput = page.getByPlaceholder(/name/i);
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("Test Player");
      const submitButton = page.getByRole("button", {
        name: /continue|start|join/i,
      });
      await submitButton.click();
    }

    // Play 4 rounds
    for (let round = 1; round <= 4; round++) {
      // Should be on round play screen — find the answer input
      const answerInput = page.getByPlaceholder(/answer/i);
      await expect(answerInput).toBeVisible({ timeout: 10_000 });

      // Type an answer and submit
      await answerInput.fill("love");
      await page.getByRole("button", { name: /submit|guess/i }).click();

      // Should see round result
      await expect(page.getByText(/score|points/i)).toBeVisible({
        timeout: 10_000,
      });

      // Click next (or if round 4, it goes to final results automatically)
      const nextButton = page.getByRole("button", {
        name: /next|continue|see results/i,
      });
      await nextButton.click();
    }

    // Should be on final results screen
    await expect(page.getByText(/final|total|results/i)).toBeVisible({
      timeout: 10_000,
    });

    // View leaderboard
    const leaderboardButton = page.getByRole("button", {
      name: /leaderboard/i,
    });
    if (await leaderboardButton.isVisible().catch(() => false)) {
      await leaderboardButton.click();
      await expect(page.getByText(/leaderboard|ranking/i)).toBeVisible();
    }
  });
});
