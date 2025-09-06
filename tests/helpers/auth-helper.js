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
  const currentUrl = page.url();
  if (!currentUrl.includes("/") || currentUrl.includes("/dashboard")) {
    await page.goto("/");
  }

  const userStatus = page.locator(".user-status");
  if (await userStatus.isVisible()) {
    return;
  }

  const loginForm = page.locator("#loginForm");

  if (!(await loginForm.isVisible())) {
    try {
      await page.waitForSelector(".sign-in-link", { state: "visible" });
      await page.click(".sign-in-link");
      await page.waitForSelector("#loginForm", { state: "visible" });
    } catch (error) {
      throw new Error("Could not find login form or sign-in link");
    }
  }

  await page.fill("#email", email);
  await page.click("#loginButton");

  await page.waitForSelector("#devMagicLink", { timeout: 10000 });

  await page.click("#devMagicLink");

  await page.waitForSelector(".user-status", { timeout: 10000 });
}

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
  page.on("dialog", (dialog) => dialog.accept());

  await page.click("#logoutButton");
  // TODO: Replace waitForTimeout with proper condition waiting
  await page.waitForTimeout(500);

  await expect(page.locator(".sign-in-link")).toBeVisible();
  await expect(page.locator(".user-status")).not.toBeVisible();
}
