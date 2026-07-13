import { test, expect } from "@playwright/test";

test.describe("recognition feed", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "E2E credentials not configured");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/feed/);
  });

  test("shows company feed and filter controls", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /company feed/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Hashtag", { exact: true })).toBeVisible();
    await expect(page.getByLabel("User")).toBeVisible();
  });

  test("navigates to leaderboard", async ({ page }) => {
    await page.getByRole("link", { name: "Leaderboard" }).click();
    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(
      page.getByRole("heading", { name: /leaderboard/i }),
    ).toBeVisible();
  });
});
