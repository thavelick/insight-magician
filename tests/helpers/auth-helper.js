import { expect } from "@playwright/test";

// This avoids database locking issues by using the UI magic link instead of database queries
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

export async function logoutUser(page) {
  page.on("dialog", (dialog) => dialog.accept());

  await page.click("#logoutButton");

  await page.waitForSelector(".sign-in-link");

  await expect(page.locator(".sign-in-link")).toBeVisible();
  await expect(page.locator(".user-status")).not.toBeVisible();
}
