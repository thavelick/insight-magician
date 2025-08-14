import { expect, test } from "@playwright/test";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  openSchemaSidebar,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("Schema Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper function to verify view schema button state
  async function verifyViewSchemaButton(page, visible) {
    if (visible) {
      await expect(page.locator("#view-schema")).toBeVisible();
    } else {
      await expect(page.locator("#view-schema")).toBeHidden();
    }
  }

  // Helper function to verify schema content
  async function verifySchemaContent(page) {
    await expect(page.locator(".schema-sidebar .schema-content")).toBeVisible();
    await expect(page.locator(".schema-content .table-info")).toBeVisible();
    await expect(page.locator(".table-header h4")).toContainText("users");
    await expect(page.locator(".row-count")).toBeVisible();
    await expect(page.locator(".column").first()).toBeVisible();
    await expect(page.locator(".column-name").first()).toBeVisible();
    await expect(page.locator(".column-type").first()).toBeVisible();
  }

  // Helper function to verify schema sidebar visibility
  async function verifySchemaSidebar(page, visible) {
    if (visible) {
      await expect(page.locator(".schema-sidebar")).toBeVisible();
    } else {
      await expect(page.locator(".schema-sidebar")).not.toHaveClass(/visible/);
    }
  }

  test("should show schema sidebar after database upload", async ({ page }) => {
    // Initially no view schema button should be visible
    await verifyViewSchemaButton(page, false);

    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // View schema button should appear after database load
    await verifyViewSchemaButton(page, true);

    // Schema sidebar should be visible automatically
    await verifySchemaSidebar(page, true);
    await verifySchemaContent(page);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should hide and show schema sidebar with view schema button", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Schema should be visible initially
    await verifySchemaSidebar(page, true);

    await page.click(".schema-sidebar .close-schema");
    await verifySchemaSidebar(page, false);

    // Reopen with view schema button
    await page.click("#view-schema");
    await verifySchemaSidebar(page, true);
    await verifySchemaContent(page);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should display schema with proper table and column information", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await openSchemaSidebar(page);

    // Verify database schema header
    await expect(page.locator(".schema-header h3")).toContainText(
      "Database Schema",
    );
    await expect(page.locator(".close-schema")).toBeVisible();

    // Verify table information
    await expect(page.locator(".table-info")).toBeVisible();
    await expect(page.locator(".table-header h4")).toContainText("users");

    // Verify row count is displayed
    await expect(page.locator(".row-count")).toBeVisible();
    await expect(page.locator(".row-count")).toContainText("rows");

    // Verify column information
    await expect(page.locator(".column")).toHaveCount(3); // id, name, email from basic fixture

    // Check specific columns exist
    await expect(page.locator(".column-name:has-text('id')")).toBeVisible();
    await expect(page.locator(".column-name:has-text('name')")).toBeVisible();
    await expect(page.locator(".column-name:has-text('email')")).toBeVisible();

    // Verify column types are shown
    await expect(page.locator(".column-type").first()).toBeVisible();

    // Check for badges (PK, NOT NULL)
    await expect(page.locator(".pk-badge")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should hide view schema button when no database is loaded", async ({
    page,
  }) => {
    // Initially no database loaded, button should be hidden
    await verifyViewSchemaButton(page, false);

    // Load database to show button
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await verifyViewSchemaButton(page, true);

    // Clear database by clearing session storage and reloading
    await page.evaluate(() => {
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Button should be hidden again
    await verifyViewSchemaButton(page, false);

    await cleanupUploadedFile(uploadedFilename);
  });
});
