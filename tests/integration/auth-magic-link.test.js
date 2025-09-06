import { expect, test } from "@playwright/test";
import {
  authenticateUser,
  logoutUser,
  verifyUserIsAuthenticated,
} from "../helpers/auth-helper.js";

test.describe("Magic Link Authentication", () => {
  const magicLinkToken = null;

  test("should complete full magic link authentication flow", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("text=Drop your SQLite database file here");

    // Verify we see the Sign In link initially
    await expect(page.locator(".sign-in-link")).toBeVisible();
    await expect(page.locator(".sign-in-link")).toContainText("Sign In");

    const testEmail = `test-${Date.now()}@example.com`;
    await authenticateUser(page, testEmail);

    await verifyUserIsAuthenticated(page, testEmail);

    await logoutUser(page);
  });

  test("should handle invalid magic link tokens", async ({ page }) => {
    await page.goto("/");

    const invalidToken = "invalid-token-12345";
    const verifyResponse = await page.request.get(
      `/api/auth/verify?token=${encodeURIComponent(invalidToken)}`,
    );

    expect(verifyResponse.ok()).toBeFalsy();
    expect(verifyResponse.status()).toBe(400);

    const errorData = await verifyResponse.json();
    expect(errorData.error).toContain("Invalid or expired token");
  });
});
