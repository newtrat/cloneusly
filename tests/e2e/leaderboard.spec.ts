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

  test("shows achievements and retains rolling rankings", async ({ page }) => {
    await page.getByRole("link", { name: "Leaderboard" }).click();
    await expect(
      page.getByRole("heading", { name: "Achievements", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your achievements" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "All-user ranking" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "All time" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sent" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Received" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Total" })).toBeVisible();

    await page.getByRole("button", { name: "View achievement tiers" }).click();
    const tierDialog = page.getByRole("dialog", {
      name: "Achievement tiers",
    });
    await expect(tierDialog).toBeVisible();
    await expect(
      tierDialog.getByRole("row", { name: /Stone 1 pts 1 pts 1 pts/i }),
    ).toBeVisible();
    await expect(
      tierDialog.getByRole("row", {
        name: /Diamond 500 pts 500 pts 1,000 pts/i,
      }),
    ).toBeVisible();
    await tierDialog.getByRole("tab", { name: "All time" }).click();
    await expect(
      tierDialog.getByRole("row", {
        name: /Diamond 2,500 pts 2,500 pts 5,000 pts/i,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("tab", { name: "Received" }).click();
    await expect(page).toHaveURL(/metric=received/);
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
    await page.getByRole("tab", { name: "All time" }).click();
    await expect(page).toHaveURL(/achievementPeriod=allTime/);

    await expect(
      page.getByRole("heading", {
        name: "Rolling recognition leaderboard",
      }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /24 hours/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /7 days/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /30 days/i })).toBeVisible();
    await expect(page.getByLabel("Hashtag filter (optional)")).toBeVisible();
  });
});
