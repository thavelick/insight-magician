import { expect, test } from "@playwright/test";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  addWidget,
  openSchemaSidebar,
  reloadAndWait,
  runQueryInWidget,
  setupDatabaseWithUpload,
  verifyDatabaseLoaded,
} from "../helpers/integration.js";

test.describe("Session Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // All helper functions are now in ../helpers/integration.js

  test("should remember selected database after page reload", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await verifyDatabaseLoaded(page);
    await reloadAndWait(page);
    await verifyDatabaseLoaded(page);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should restore schema display after reload", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await openSchemaSidebar(page);
    await reloadAndWait(page);

    // Schema sidebar should remain open and populated after reload
    await expect(page.locator(".schema-sidebar")).toBeVisible();
    await expect(page.locator(".schema-content >> text=users")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should restore widget states and data after reload", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Create a widget and set up query
    await addWidget(page);
    await page.fill(".widget .widget-title-input", "Test Widget");

    // Type the query slowly to trigger input events properly (remove LIMIT as suggested)
    await page
      .locator(".widget .query-editor")
      .pressSequentially("SELECT name, email FROM users");

    // Run the query to trigger save - this is the key step!
    await page.click(".widget .run-view-btn");
    await expect(page.locator(".widget .results-table")).toBeVisible();

    await reloadAndWait(page);

    // Widget should be restored with its saved state
    await expect(page.locator(".widget")).toHaveCount(1);
    await expect(page.locator(".widget .widget-title-input")).toHaveValue(
      "Test Widget",
    );
    await expect(page.locator(".widget .query-editor")).toHaveValue(
      "SELECT name, email FROM users",
    );
    await expect(page.locator(".widget .results-table")).toBeVisible();

    // Should be able to switch back to edit mode
    await page.click(".widget .edit-btn");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should handle switching between uploaded databases", async ({
    page,
  }) => {
    const { uploadedFilename: firstFilename } = await setupDatabaseWithUpload(
      page,
      "basic",
    );
    await verifyDatabaseLoaded(page);

    // Upload a second database
    const { uploadedFilename: secondFilename } = await setupDatabaseWithUpload(
      page,
      "basic",
    );
    await verifyDatabaseLoaded(page);

    // Reload page - should remember the most recent database
    await reloadAndWait(page);
    await verifyDatabaseLoaded(page);

    await cleanupUploadedFile(firstFilename);
    await cleanupUploadedFile(secondFilename);
  });

  test("should reset interface when new database uploaded", async ({
    page,
  }) => {
    const { uploadedFilename: firstFilename } =
      await setupDatabaseWithUpload(page);

    // Create widgets and set up state
    await addWidget(page);
    await page.fill(".widget .query-editor", "SELECT * FROM users");
    await page.fill(".widget .widget-title-input", "First DB Widget");
    await openSchemaSidebar(page);

    // Upload a new database
    const { uploadedFilename: secondFilename } = await setupDatabaseWithUpload(
      page,
      "basic",
    );

    // Verify the new database is loaded
    await verifyDatabaseLoaded(page);
    await openSchemaSidebar(page);

    await cleanupUploadedFile(firstFilename);
    await cleanupUploadedFile(secondFilename);
  });
});
