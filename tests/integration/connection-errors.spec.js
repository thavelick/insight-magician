import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupDatabase, cleanupUploadedFile } from "../helpers/database.js";
import { uploadCorruptedDatabaseAndTestSchemaFailure } from "../helpers/integration.js";

test.describe("Database Connection Errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    await authenticateUser(page);
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  test("should handle schema extraction failures", async ({ page }) => {
    const { uploadedFilename, corruptedDbPath } =
      await uploadCorruptedDatabaseAndTestSchemaFailure(page);

    try {
      await expect(page.locator(".upload-status.error")).toBeVisible();
      await expect(
        page.locator("text=Failed to load database schema"),
      ).toBeVisible();
      await expect(
        page.locator("button:has-text('View Schema')"),
      ).not.toBeVisible();

      const schemaContentText = await page
        .locator(".schema-content")
        .textContent();
      expect(schemaContentText).not.toContain("users");
    } finally {
      await cleanupDatabase(corruptedDbPath);
      await cleanupUploadedFile(uploadedFilename);
    }
  });
});
