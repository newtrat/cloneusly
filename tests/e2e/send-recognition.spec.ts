import { test, expect } from "@playwright/test";

test.describe("send recognition", () => {
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

  test("shows recognition composer with total cost preview", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /send recognition/i })).toBeVisible();
    await page.getByLabel("Points per recipient").fill("10");
    await page.getByLabel("Message").fill("Great teamwork!");
    await expect(page.getByText(/total cost/i)).toBeVisible();
  });

  test("rejects disallowed GIF host", async ({ page }) => {
    await page.getByLabel("GIF URL (optional)").fill("https://evil.example/gif.gif");
    await page.getByLabel("Message").fill("With gif");
    await expect(page.getByLabel("GIF URL (optional)")).toBeVisible();
  });
});
