import { test, expect } from "@playwright/test";

test.describe("social notifications", () => {
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

  test("shows notifications page with read controls", async ({ page }) => {
    await page.getByRole("link", { name: /notifications/i }).click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByRole("button", { name: /mark all read/i })).toBeVisible();
  });

  test("shows reaction controls on feed cards when present", async ({ page }) => {
    const reactionGroup = page.getByRole("group", { name: "Reactions" });
    if (await reactionGroup.count()) {
      await expect(reactionGroup.first()).toBeVisible();
    }
  });
});
