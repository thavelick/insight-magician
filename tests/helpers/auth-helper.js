import { expect } from "@playwright/test";

/**
 * Authentication helper for integration tests
 * Provides utilities to quickly authenticate users before running tests
 */

/**
 * Authenticates a user by using the magic link displayed in the UI during test mode
 * This avoids database locking issues by using the UI magic link instead of database queries
 *
 * @param {Page} page - Playwright page object
 * @param {string} email - Email address to authenticate (default: test email)
 * @returns {Promise<void>}
 */
export async function authenticateUserWithUI(
  page,
  email = `test-${Date.now()}@example.com`,
) {
  // If we're not on the login page, navigate to it
  const currentUrl = page.url();
  if (!currentUrl.includes("/") || currentUrl.includes("/dashboard")) {
    await page.goto("/");
  }

  // If already authenticated, return early
  const userStatus = page.locator(".user-status");
  if (await userStatus.isVisible()) {
    return;
  }

  // Look for the login form - if not visible, might be on main app screen
  const loginForm = page.locator("#loginForm");

  if (!(await loginForm.isVisible())) {
    // Click sign in link if we're on main app screen
    try {
      await page.waitForSelector(".sign-in-link", { state: "visible" });
      await page.click(".sign-in-link");
      // Wait for login screen to appear
      await page.waitForSelector("#loginForm", { state: "visible" });
    } catch (error) {
      throw new Error("Could not find login form or sign-in link");
    }
  }

  // Step 1: Fill in email and submit login form
  await page.fill("#email", email);
  await page.click("#loginButton");

  // Step 2: Wait for the magic link to appear in the UI (test mode)
  await page.waitForSelector("#devMagicLink", { timeout: 10000 });

  // Step 3: Click the magic link to authenticate
  await page.click("#devMagicLink");

  // Step 4: Wait for authentication to complete (should redirect or show user status)
  await page.waitForSelector(".user-status", { timeout: 10000 });

  // Session cookie is now set, user is authenticated
}

// Export the UI-based authentication as the default method
export const authenticateUser = authenticateUserWithUI;

/**
 * Verifies that a user is currently authenticated by checking the page state
 *
 * @param {Page} page - Playwright page object
 * @param {string} email - Expected email address of authenticated user
 * @returns {Promise<void>}
 */
export async function verifyUserIsAuthenticated(page, email) {
  await page.reload();
  await page.waitForSelector(".app-header");

  // Should show user status instead of sign-in link
  const signInLink = page.locator(".sign-in-link");
  const userStatus = page.locator(".user-status");
  const userEmail = page.locator(".user-email");

  await expect(signInLink).not.toBeVisible();
  await expect(userStatus).toBeVisible();
  await expect(userEmail).toContainText(email);
}

/**
 * Logs out the current user
 *
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function logoutUser(page) {
  // Set up dialog handler for logout confirmation
  page.on("dialog", (dialog) => dialog.accept());

  await page.click("#logoutButton");
  await page.waitForTimeout(500);

  // Should return to showing sign-in link
  await expect(page.locator(".sign-in-link")).toBeVisible();
  await expect(page.locator(".user-status")).not.toBeVisible();
}
