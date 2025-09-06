import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  addWidget,
  runQueryInWidget,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("User-Facing Error Messages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    // Authenticate user since endpoints now require auth
    await authenticateUser(page);
  });

  async function simulateUploadError(page) {
    const invalidFile = Buffer.from("not a database", "utf8");
    await page.setInputFiles("input[type=file]", {
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: invalidFile,
    });
  }

  test("should show helpful error messages when upload fails", async ({
    page,
  }) => {
    await page.waitForSelector("text=Drop your SQLite database file here");

    await simulateUploadError(page);

    await expect(page.locator(".upload-status.error")).toBeVisible();
    await expect(page.locator(".upload-status.error p")).toContainText(
      /error|invalid|format/i,
    );
    await expect(page.locator(".try-again")).toBeVisible();

    await page.click(".try-again");
    await expect(
      page.locator("text=Drop your SQLite database file here"),
    ).toBeVisible();
  });

  test("should display clear errors when queries fail", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toBeVisible();
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    const invalidQuery = "SELECT * FROM nonexistent_table";
    await page.locator(".widget .query-editor").fill(invalidQuery);

    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    await page.click(".widget .run-view-btn");
    const queryResponse = await queryResponsePromise;

    expect(queryResponse.status()).toBe(400);

    await expect(
      page.locator(".widget .error-state, .widget .error-message"),
    ).toBeVisible();
    await expect(
      page.locator(".widget .error-state p, .widget .error-message p"),
    ).toContainText(/error|table|exist/i);

    await cleanupUploadedFile(uploadedFilename);
  });
});
