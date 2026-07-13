import { test, expect } from "@playwright/test";

test.describe("convert points", () => {
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

  test("shows conversion form on points settings", async ({ page }) => {
    await page.getByRole("link", { name: "Points" }).click();
    await expect(page).toHaveURL(/\/settings\/points/);
    await expect(
      page.getByRole("heading", { name: /convert received points/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Amount to convert")).toBeVisible();
  });
});
