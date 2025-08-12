import { expect, test } from "@playwright/test";
import {
  cleanupDatabase,
  cleanupUploadedFile,
  createDatabaseFromFixture,
  getTempDatabasePath,
  uploadFileViaUI,
} from "../helpers/database.js";

test.describe("Query Processing & Pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper function to upload database and prepare for query testing
  async function setupDatabaseForQueries(page, fixtureName = "basic") {
    const testDbPath = getTempDatabasePath(fixtureName);
    await createDatabaseFromFixture(fixtureName, testDbPath);

    // Upload database
    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/upload"),
    );

    await uploadFileViaUI(page, testDbPath);

    const uploadResponse = await uploadResponsePromise;
    const uploadBody = await uploadResponse.json();
    const uploadedFilename = uploadBody.filename;

    // Clean up test database file
    await cleanupDatabase(testDbPath);

    return { uploadedFilename };
  }

  test("should execute queries and format results correctly", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseForQueries(page);

    // Add a widget to test query execution (auto-flips to settings form)
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toBeVisible();

    // Wait for settings form to appear after auto-flip animation
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    const queryInput = page.locator(".widget .query-editor");
    await queryInput.fill("SELECT * FROM users WHERE name LIKE 'A%'");

    // Set up response listener before executing query
    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    // Execute query
    await page.click(".widget .run-view-btn");

    // Wait for query response
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

    // Cleanup
    await cleanupUploadedFile(uploadedFilename);
  });

  test("should implement pagination with proper metadata", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseForQueries(page);

    // Add widget and query for all users with small page size
    await page.click("button:has-text('Add Widget')");
    await page.click(".widget .edit-btn");

    // Test direct API call with pagination parameters
    const queryResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users ORDER BY id",
        page: 1,
        pageSize: 3, // Small page size to test pagination
      },
    });

    expect(queryResponse.status()).toBe(200);
    const queryBody = await queryResponse.json();

    // Validate pagination metadata
    expect(queryBody.success).toBe(true);
    expect(queryBody.page).toBe(1);
    expect(queryBody.pageSize).toBe(3);
    expect(queryBody.totalRows).toBe(10); // From basic.sql fixture
    expect(queryBody.totalPages).toBe(4); // Math.ceil(10 / 3)
    expect(queryBody.hasMore).toBe(true); // Page 1 of 4
    expect(queryBody.rows.length).toBe(3); // First 3 rows

    // Test page 2
    const page2Response = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users ORDER BY id",
        page: 2,
        pageSize: 3,
      },
    });

    const page2Body = await page2Response.json();
    expect(page2Body.page).toBe(2);
    expect(page2Body.hasMore).toBe(true);
    expect(page2Body.rows.length).toBe(3);

    // Test last page
    const lastPageResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users ORDER BY id",
        page: 4,
        pageSize: 3,
      },
    });

    const lastPageBody = await lastPageResponse.json();
    expect(lastPageBody.page).toBe(4);
    expect(lastPageBody.hasMore).toBe(false); // Last page
    expect(lastPageBody.rows.length).toBe(1); // Only 1 row on last page

    // Cleanup
    await cleanupUploadedFile(uploadedFilename);
  });

  test("should validate and sanitize pagination parameters", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseForQueries(page);

    // Test invalid page numbers (should clamp to 1)
    const negativePageResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: -5,
        pageSize: 10,
      },
    });

    const negativePageBody = await negativePageResponse.json();
    expect(negativePageBody.page).toBe(1); // Clamped to minimum

    // Test invalid page size (should clamp to max)
    const largeSizeResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: 1,
        pageSize: 5000, // Above MAX_PAGE_SIZE (1000)
      },
    });

    const largeSizeBody = await largeSizeResponse.json();
    expect(largeSizeBody.pageSize).toBe(1000); // Clamped to maximum

    // Test zero page size (should clamp to 1)
    const zeroSizeResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: 1,
        pageSize: 0,
      },
    });

    const zeroSizeBody = await zeroSizeResponse.json();
    expect(zeroSizeBody.pageSize).toBe(1); // Clamped to minimum

    // Cleanup
    await cleanupUploadedFile(uploadedFilename);
  });

  test("should calculate total pages and hasMore correctly", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseForQueries(page);

    // Test exact division (10 rows, 5 per page = 2 pages)
    const exactResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: 1,
        pageSize: 5,
      },
    });

    const exactBody = await exactResponse.json();
    expect(exactBody.totalPages).toBe(2); // 10 / 5 = 2
    expect(exactBody.hasMore).toBe(true); // Page 1 of 2

    // Test page 2 of exact division
    const exact2Response = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: 2,
        pageSize: 5,
      },
    });

    const exact2Body = await exact2Response.json();
    expect(exact2Body.hasMore).toBe(false); // Last page

    // Test single page (page size larger than total)
    const singlePageResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users",
        page: 1,
        pageSize: 20,
      },
    });

    const singlePageBody = await singlePageResponse.json();
    expect(singlePageBody.totalPages).toBe(1);
    expect(singlePageBody.hasMore).toBe(false);

    // Test empty result set
    const emptyResponse = await page.request.post("/api/query", {
      data: {
        filename: uploadedFilename,
        query: "SELECT * FROM users WHERE name = 'NonexistentUser'",
        page: 1,
        pageSize: 10,
      },
    });

    const emptyBody = await emptyResponse.json();
    expect(emptyBody.totalRows).toBe(0);
    expect(emptyBody.totalPages).toBe(0);
    expect(emptyBody.hasMore).toBe(false);
    expect(emptyBody.rows.length).toBe(0);

    // Cleanup
    await cleanupUploadedFile(uploadedFilename);
  });
});
