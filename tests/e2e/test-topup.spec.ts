import { test, expect } from "@playwright/test";

test.describe("test top-up", () => {
  test("shows points settings for authenticated users", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "E2E credentials not configured");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("link", { name: "Points" }).click();
    await expect(page.getByRole("heading", { name: /^Points$/ })).toBeVisible();
  });
});
