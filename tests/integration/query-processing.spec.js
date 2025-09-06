import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  executeQueryAPI,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("Query Processing & Pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    // Authenticate user since endpoints now require auth
    await authenticateUser(page);
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  test("should execute queries and format results correctly", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Widgets auto-flip to settings form after creation
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toBeVisible();

    // Wait for settings form to appear after auto-flip animation
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    await page
      .locator(".widget .query-editor")
      .fill("SELECT * FROM users WHERE name LIKE 'A%'");

    // Set up response listener before executing query
    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    await page.click(".widget .run-view-btn");

    const queryResponse = await queryResponsePromise;
    expect(queryResponse.status()).toBe(200);

    const queryBody = await queryResponse.json();

    // Validate query response format
    expect(queryBody.success).toBe(true);
    expect(queryBody.columns).toBeDefined();
    expect(queryBody.rows).toBeDefined();
    expect(queryBody.totalRows).toBeDefined();
    expect(queryBody.page).toBe(1);
    expect(queryBody.pageSize).toBe(50); // Default page size

    // Validate specific data - should find Alice Johnson
    expect(queryBody.columns).toEqual(["id", "name", "email"]);
    expect(queryBody.rows.length).toBe(1);
    expect(queryBody.rows[0]).toEqual([
      1,
      "Alice Johnson",
      "alice@example.com",
    ]);
    expect(queryBody.totalRows).toBe(1);

    // Verify UI shows the results
    await expect(page.locator(".widget .results-table")).toBeVisible();
    await expect(page.locator("text=Alice Johnson")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should implement pagination with proper metadata", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    const queryResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users ORDER BY id",
      { pageSize: 3 },
    );

    expect(queryResponse.status()).toBe(200);
    const queryBody = await queryResponse.json();

    // Validate pagination metadata
    expect(queryBody.success).toBe(true);
    expect(queryBody.page).toBe(1);
    expect(queryBody.pageSize).toBe(3);
    expect(queryBody.totalRows).toBe(10); // From basic.sql fixture
    expect(queryBody.totalPages).toBe(4); // Math.ceil(10 / 3)
    expect(queryBody.hasMore).toBe(true);
    expect(queryBody.rows.length).toBe(3);

    const page2Response = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users ORDER BY id",
      { page: 2, pageSize: 3 },
    );
    const page2Body = await page2Response.json();
    expect(page2Body.page).toBe(2);
    expect(page2Body.hasMore).toBe(true);
    expect(page2Body.rows.length).toBe(3);

    const lastPageResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users ORDER BY id",
      { page: 4, pageSize: 3 },
    );
    const lastPageBody = await lastPageResponse.json();
    expect(lastPageBody.page).toBe(4);
    expect(lastPageBody.hasMore).toBe(false); // Last page
    expect(lastPageBody.rows.length).toBe(1); // Only 1 row on last page

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should validate and sanitize pagination parameters", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    const negativePageResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { page: -5, pageSize: 10 },
    );
    const negativePageBody = await negativePageResponse.json();
    expect(negativePageBody.page).toBe(1); // Clamped to minimum

    const largeSizeResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 5000 },
    );
    const largeSizeBody = await largeSizeResponse.json();
    expect(largeSizeBody.pageSize).toBe(1000); // Clamped to maximum

    const zeroSizeResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 0 },
    );
    const zeroSizeBody = await zeroSizeResponse.json();
    expect(zeroSizeBody.pageSize).toBe(1); // Clamped to minimum

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should calculate total pages and hasMore correctly", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Test exact division (10 rows, 5 per page = 2 pages)
    const exactResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 5 },
    );
    const exactBody = await exactResponse.json();
    expect(exactBody.totalPages).toBe(2); // 10 / 5 = 2
    expect(exactBody.hasMore).toBe(true); // Page 1 of 2

    const exact2Response = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { page: 2, pageSize: 5 },
    );
    const exact2Body = await exact2Response.json();
    expect(exact2Body.hasMore).toBe(false); // Last page

    // Test single page (page size larger than total)
    const singlePageResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 20 },
    );
    const singlePageBody = await singlePageResponse.json();
    expect(singlePageBody.totalPages).toBe(1);
    expect(singlePageBody.hasMore).toBe(false);

    // Test empty result set
    const emptyResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users WHERE name = 'NonexistentUser'",
      { pageSize: 10 },
    );
    const emptyBody = await emptyResponse.json();
    expect(emptyBody.totalRows).toBe(0);
    expect(emptyBody.totalPages).toBe(0);
    expect(emptyBody.hasMore).toBe(false);
    expect(emptyBody.rows.length).toBe(0);

    await cleanupUploadedFile(uploadedFilename);
  });
});
