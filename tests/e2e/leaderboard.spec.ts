import { test, expect } from "@playwright/test";

test.describe("leaderboard", () => {
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

  test("shows period tabs and rankings area", async ({ page }) => {
    await page.getByRole("link", { name: "Leaderboard" }).click();
    await expect(page.getByRole("tab", { name: /24 hours/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /7 days/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /30 days/i })).toBeVisible();
  });
});
