import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
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
    // Authenticate user since /api/schema now requires auth
    await authenticateUser(page);
  });

  // Helper functions for schema extraction tests

  // CRITICAL: Set up response listeners BEFORE triggering upload action
  // This prevents race conditions where fast API responses complete before we start listening
  async function uploadDatabaseAndGetSchema(page, fixtureName) {
    const testDbPath = getTempDatabasePath(fixtureName);
    await createDatabaseFromFixture(fixtureName, testDbPath);

    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/upload"),
    );
    const schemaResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/schema"),
    );

    await uploadFileViaUI(page, testDbPath);

    const uploadResponse = await uploadResponsePromise;
    const uploadBody = await uploadResponse.json();
    const schemaResponse = await schemaResponsePromise;

    await cleanupDatabase(testDbPath);

    return {
      uploadResponse,
      uploadBody,
      schemaResponse,
      uploadedFilename: uploadBody.filename,
    };
  }

  test("should extract and format schema correctly", async ({ page }) => {
    const { schemaResponse, uploadedFilename } =
      await uploadDatabaseAndGetSchema(page, "basic");

    expect(schemaResponse.status()).toBe(200);
    const schemaBody = await schemaResponse.json();

    // Validate schema response format
    expect(schemaBody.success).toBe(true);
    expect(schemaBody.filename).toBe(uploadedFilename);
    expect(schemaBody.schema).toBeDefined();

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

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should return proper error when database file missing", async ({
    page,
  }) => {
    const response = await page.request.get(
      "/api/schema?filename=nonexistent.db",
    );

    expect(response.status()).toBe(404);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Database file not found");
    expect(responseBody.success).toBeUndefined(); // Should not have success field on error
  });
});
