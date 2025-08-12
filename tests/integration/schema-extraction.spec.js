import { expect, test } from "@playwright/test";
import {
  cleanupDatabase,
  cleanupUploadedFile,
  createDatabaseFromFixture,
  getTempDatabasePath,
  uploadFileViaUI,
} from "../helpers/database.js";

test.describe("Schema Extraction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  test("should extract and format schema correctly", async ({ page }) => {
    const testDbPath = getTempDatabasePath("basic");
    await createDatabaseFromFixture("basic", testDbPath);

    // CRITICAL: Set up response listeners BEFORE triggering the upload action
    // 
    // Why this timing matters:
    // 1. User uploads file → /api/upload is called
    // 2. Upload succeeds → frontend immediately calls /api/schema (happens in milliseconds)
    // 3. Schema response comes back very quickly
    // 
    // If we set up the schema listener AFTER upload, we create a race condition:
    // - Fast schema response: We miss it and timeout waiting for a response that already finished
    // - Slow schema response: We might catch it, but it's unreliable and flaky
    //
    // Playwright rule: Always set up page.waitForResponse() listeners BEFORE the action
    // that triggers them, never after.
    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/upload"),
    );
    const schemaResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/schema"),
    );

    await uploadFileViaUI(page, testDbPath);

    // Get the uploaded filename from upload response
    const uploadResponse = await uploadResponsePromise;
    const uploadBody = await uploadResponse.json();
    const uploadedFilename = uploadBody.filename;

    // Wait for schema to load automatically after upload
    const schemaResponse = await schemaResponsePromise;
    expect(schemaResponse.status()).toBe(200);

    const schemaBody = await schemaResponse.json();

    // Validate schema response format
    expect(schemaBody.success).toBe(true);
    expect(schemaBody.filename).toBe(uploadedFilename);
    expect(schemaBody.schema).toBeDefined();

    // Validate users table schema structure
    expect(schemaBody.schema.users).toBeDefined();
    const usersTable = schemaBody.schema.users;

    expect(usersTable.columns).toHaveLength(3);
    expect(usersTable.rowCount).toBe(10); // From basic.sql fixture

    // Validate column details
    const idColumn = usersTable.columns.find((col) => col.name === "id");
    expect(idColumn.type).toBe("INTEGER");
    expect(idColumn.primaryKey).toBe(true);
    expect(idColumn.nullable).toBe(true); // SQLite reports INTEGER PRIMARY KEY as nullable

    const nameColumn = usersTable.columns.find((col) => col.name === "name");
    expect(nameColumn.type).toBe("TEXT");
    expect(nameColumn.primaryKey).toBe(false);
    expect(nameColumn.nullable).toBe(false);

    const emailColumn = usersTable.columns.find((col) => col.name === "email");
    expect(emailColumn.type).toBe("TEXT");
    expect(emailColumn.primaryKey).toBe(false);
    expect(emailColumn.nullable).toBe(false);

    // Verify schema displays in UI
    await expect(page.locator(".schema-content")).toBeVisible();
    await expect(page.locator(".schema-content >> text=users")).toBeVisible();
    await expect(page.locator(".schema-content >> text=id")).toBeVisible();
    await expect(page.locator(".schema-content >> text=name")).toBeVisible();
    await expect(page.locator(".schema-content >> text=email")).toBeVisible();

    // Cleanup
    await cleanupDatabase(testDbPath);
    await cleanupUploadedFile(uploadedFilename);
  });

  test.skip("should handle databases with no tables gracefully", async ({ page }) => {
    const testDbPath = getTempDatabasePath("empty");
    await createDatabaseFromFixture("empty", testDbPath);

    // Set up promises for responses
    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/upload"),
    );

    await uploadFileViaUI(page, testDbPath);

    const uploadResponse = await uploadResponsePromise;
    const uploadBody = await uploadResponse.json();
    const uploadedFilename = uploadBody.filename;

    // Set up promise to wait for schema response
    const schemaResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/schema"),
    );

    await schemaResponsePromise;
    const schemaResponse = await schemaResponsePromise;
    expect(schemaResponse.status()).toBe(200);

    const schemaBody = await schemaResponse.json();

    // Validate empty schema response
    expect(schemaBody.success).toBe(true);
    expect(schemaBody.filename).toBe(uploadedFilename);
    expect(schemaBody.schema).toEqual({}); // Empty object for no tables

    // Verify UI handles empty schema appropriately
    await expect(page.locator(".schema-content")).toBeVisible();
    // Should not show any table names since there are none

    // Cleanup
    await cleanupDatabase(testDbPath);
    await cleanupUploadedFile(uploadedFilename);
  });

  test.skip("should return proper error when database file missing", async ({
    page,
  }) => {
    // Test direct API call with non-existent filename
    const response = await page.request.get(
      "/api/schema?filename=nonexistent.db",
    );

    expect(response.status()).toBe(404);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Database file not found");
    expect(responseBody.success).toBeUndefined(); // Should not have success field on error
  });
});