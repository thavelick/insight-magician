import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  executeQueryAPI,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("Pagination Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    // Authenticate user before running tests
    await authenticateUser(page);

    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  test("should handle different page sizes within limits", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Test minimum page size (1)
    const minResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 1 },
    );
    const minBody = await minResponse.json();
    expect(minBody.pageSize).toBe(1);
    expect(minBody.rows.length).toBe(1);

    // Test maximum page size (1000)
    const maxResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { pageSize: 1000 },
    );
    const maxBody = await maxResponse.json();
    expect(maxBody.pageSize).toBe(1000);
    expect(maxBody.rows.length).toBe(10); // All rows from basic.sql

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should fallback to counting all results when COUNT query fails", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Use a complex query that might fail COUNT(*) wrapping
    const complexQuery =
      "SELECT DISTINCT name, COUNT(*) as cnt FROM users GROUP BY name";

    const response = await executeQueryAPI(
      page,
      uploadedFilename,
      complexQuery,
      { pageSize: 5 },
    );
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.totalRows).toBeGreaterThan(0);
    expect(body.totalPages).toBeGreaterThan(0);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should handle pagination of empty result sets", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    const response = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users WHERE name = 'NonexistentUser'",
      { pageSize: 10 },
    );
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.totalRows).toBe(0);
    expect(body.totalPages).toBe(0);
    expect(body.hasMore).toBe(false);
    expect(body.rows.length).toBe(0);
    expect(body.columns.length).toBe(0); // No column info when no results

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should calculate pagination metadata correctly for edge cases", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Test requesting page beyond available data
    const beyondResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { page: 99, pageSize: 5 },
    );
    const beyondBody = await beyondResponse.json();
    expect(beyondBody.success).toBe(true);
    expect(beyondBody.page).toBe(99);
    expect(beyondBody.rows.length).toBe(0); // No data on page 99
    expect(beyondBody.hasMore).toBe(false);

    // Test edge case with exactly divisible pages
    const exactResponse = await executeQueryAPI(
      page,
      uploadedFilename,
      "SELECT * FROM users",
      { page: 2, pageSize: 5 },
    ); // 10 total rows / 5 = 2 pages exactly
    const exactBody = await exactResponse.json();
    expect(exactBody.page).toBe(2);
    expect(exactBody.totalPages).toBe(2);
    expect(exactBody.hasMore).toBe(false); // Last page

    await cleanupUploadedFile(uploadedFilename);
  });
});
