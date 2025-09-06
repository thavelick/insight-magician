// Example usage of the authentication helper in integration tests
import { expect, test } from "@playwright/test";
import { authenticateUser } from "./auth-helper.js";

test.describe("Example Test with Authentication", () => {
  test("should work with authenticated user", async ({ page }) => {
    // Navigate to the main app
    await page.goto("/");

    // Quickly authenticate a user (this will be needed when auth gates are re-added)
    await authenticateUser(page, "testuser@example.com");

    // Now the user is logged in and has a valid session
    // Continue with your test logic...
    await expect(page.locator(".user-status")).toBeVisible();

    // Test whatever functionality you need to test
    // The user will remain authenticated throughout this test
  });

  test("should work with different user", async ({ page }) => {
    await page.goto("/");

    // Each test gets a fresh user - use default email (auto-generated)
    await authenticateUser(page);

    // Continue testing...
  });

  test("should work without auth when auth is optional", async ({ page }) => {
    await page.goto("/");

    // When auth is optional, you can skip the authenticateUser() call
    // and test unauthenticated functionality
    await expect(page.locator(".sign-in-link")).toBeVisible();
  });
});

/* 
Future usage when auth gates are re-added:

test.beforeEach(async ({ page }) => {
  // Authenticate before every test in this suite
  await page.goto("/");
  await authenticateUser(page);
});

*/
