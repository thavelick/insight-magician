import { spawn } from "node:child_process";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  cleanupDatabase,
  cleanupUploadedFile,
  createDatabaseFromFixture,
  getTempDatabasePath,
  uploadFileViaUI,
} from "../helpers/database.js";

test.describe("File Upload & Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  test("should accept valid SQLite files and generate unique filename", async ({
    page,
  }) => {
    const testDbPath = getTempDatabasePath("basic");
    await createDatabaseFromFixture("basic", testDbPath);

    // Set up promise to wait for upload response
    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/upload"),
    );

    await uploadFileViaUI(page, testDbPath);

    // Wait for and validate upload response
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(200);
    const responseBody = await uploadResponse.json();

    // Validate complete response format
    expect(responseBody.success).toBe(true);
    expect(responseBody.filename).toBeDefined();
    expect(responseBody.filename).toMatch(/^database_\d+\.db$/); // Should match timestamp pattern
    expect(responseBody.size).toBeGreaterThan(0); // Should have file size
    expect(responseBody.message).toBe("Database uploaded successfully");

    const uploadedFilename = responseBody.filename;

    await page.waitForSelector(".upload-success, .schema-content", {
      timeout: 10000,
    });

    const schemaContent = page.locator(".schema-content");
    await expect(schemaContent).toBeVisible();
    await expect(page.locator("text=users")).toBeVisible();

    const addWidgetBtn = page.locator("#add-widget");
    await expect(addWidgetBtn).toBeVisible();

    // Cleanup
    await cleanupDatabase(testDbPath);
    await cleanupUploadedFile(uploadedFilename);
  });

  test("should validate SQLite file format using our validation logic", async ({
    page,
  }) => {
    const invalidFilePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "invalid",
      "test-invalid.txt",
    );

    await uploadFileViaUI(page, invalidFilePath);

    await page.waitForSelector(".upload-status.error", { timeout: 5000 });
    await expect(page.locator("text=Invalid SQLite file format")).toBeVisible();
  });

  test("should enforce file size limits correctly", async ({ page }) => {
    // Create a file that exceeds 100MB limit for testing
    const oversizedFilePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "test-oversized.db",
    );

    // Create sparse 101MB file (near-instant, minimal disk usage)
    await new Promise((resolve, reject) => {
      const dd = spawn("dd", [
        "if=/dev/zero",
        `of=${oversizedFilePath}`,
        "bs=1",
        "count=0",
        "seek=105906176",
      ]);
      dd.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`dd process exited with code ${code}`));
      });
    });

    await uploadFileViaUI(page, oversizedFilePath);

    await page.waitForSelector(".upload-status.error", { timeout: 5000 });
    await expect(
      page.locator("text=File too large. Maximum size is 100MB"),
    ).toBeVisible();

    // Cleanup the large test file
    await cleanupDatabase(oversizedFilePath);
  });
});
