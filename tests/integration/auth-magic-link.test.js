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
    // Step 1: Go to the main app (should work without auth)
    await page.goto("/");
    await page.waitForSelector("text=Drop your SQLite database file here");

    // Verify we see the Sign In link initially
    await expect(page.locator(".sign-in-link")).toBeVisible();
    await expect(page.locator(".sign-in-link")).toContainText("Sign In");

    // Step 2: Use helper to authenticate user
    const testEmail = `test-${Date.now()}@example.com`;
    await authenticateUser(page, testEmail);

    // Step 3: Verify user is now authenticated
    await verifyUserIsAuthenticated(page, testEmail);

    // Step 4: Test logout functionality
    await logoutUser(page);
  });

  test("should handle invalid magic link tokens", async ({ page }) => {
    await page.goto("/");

    // Try to verify with invalid token
    const invalidToken = "invalid-token-12345";
    const verifyResponse = await page.request.get(
      `/api/auth/verify?token=${encodeURIComponent(invalidToken)}`,
    );

    expect(verifyResponse.ok()).toBeFalsy();
    expect(verifyResponse.status()).toBe(400);

    const errorData = await verifyResponse.json();
    expect(errorData.error).toContain("Invalid or expired token");
  });

  test("should handle expired magic link tokens", async ({ page }) => {
    // This test would require manipulating the database to create an expired token
    // or having a test endpoint that creates expired tokens
    // For now, we'll just test the error handling structure

    await page.goto("/");

    // TODO: Implement expired token test when we have database test utilities
    // The actual implementation would create an expired token in the database
    // and then try to verify it, expecting a 400 response
  });
});
