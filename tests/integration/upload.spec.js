import { test, expect } from "@playwright/test";

test("upload page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Insight Magician/);
});