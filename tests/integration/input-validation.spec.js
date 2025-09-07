import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import { setupDatabaseWithUpload } from "../helpers/integration.js";

test.describe("Input Validation Security", () => {
  let uploadedFilename;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    await authenticateUser(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupUploadedFile(uploadedFilename);
    uploadedFilename = null;
    await page.evaluate(() => sessionStorage.clear());
  });

  // Helper function to setup database and track filename for cleanup
  async function setupAndTrackDatabase(page) {
    const { uploadedFilename: filename } = await setupDatabaseWithUpload(page);
    uploadedFilename = filename;
    return filename;
  }

  test("should block filenames with path traversal characters in schema endpoint", async ({
    page,
  }) => {
    await setupAndTrackDatabase(page);

    const maliciousFilenames = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32\\config\\sam",
      "database/../../../etc/hosts",
      "test/../../sensitive.db",
      "test\\..\\..\\config.db",
    ];

    for (const maliciousFilename of maliciousFilenames) {
      const schemaResponse = await page.request.get(
        `/api/schema?filename=${encodeURIComponent(maliciousFilename)}`,
      );
      const responseBody = await schemaResponse.json();

      expect(schemaResponse.status()).toBe(400);
      expect(responseBody.error).toBe("Invalid filename");
    }
  });

  test("should prevent directory traversal in query endpoint", async ({
    page,
  }) => {
    const filename = await setupAndTrackDatabase(page);
    const maliciousFilenames = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32\\hosts",
      "valid/../../../etc/shadow",
      "test/../../config.db",
    ];

    for (const maliciousFilename of maliciousFilenames) {
      const queryResponse = await page.request.post("/api/query", {
        data: JSON.stringify({
          filename: maliciousFilename,
          query: "SELECT * FROM users LIMIT 10",
          page: 1,
          pageSize: 50,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const responseBody = await queryResponse.json();

      expect(queryResponse.status()).toBe(400);
      expect(responseBody.error).toBe("Invalid filename");
    }
  });

  test("should validate SQL queries using validation logic", async ({
    page,
  }) => {
    const filename = await setupAndTrackDatabase(page);
    const dangerousQueries = [
      "DROP TABLE users",
      "DELETE FROM users",
      "UPDATE users SET name = 'hacked'",
      "INSERT INTO users VALUES (999, 'hacker', 'hack@evil.com')",
      "ALTER TABLE users ADD COLUMN malicious TEXT",
      "CREATE TABLE evil (id INTEGER)",
      "SELECT * FROM users; DROP TABLE users;", // Multiple statements
      "PRAGMA table_info(users)",
    ];

    for (const dangerousQuery of dangerousQueries) {
      const queryResponse = await page.request.post("/api/query", {
        data: JSON.stringify({
          filename,
          query: dangerousQuery,
          page: 1,
          pageSize: 50,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const responseBody = await queryResponse.json();

      expect(queryResponse.status()).toBe(400);
      expect(responseBody.error).toMatch(
        /operations are not allowed|Semicolons are not allowed|clauses are not allowed/,
      );
    }
  });

  test("should return consistent error response format", async ({ page }) => {
    const filename = await setupAndTrackDatabase(page);
    const errorTests = [
      {
        endpoint: "/api/schema",
        method: "GET",
        url: "/api/schema?filename=../../../etc/passwd",
        expectedError: "Invalid filename",
      },
      {
        endpoint: "/api/query",
        method: "POST",
        data: {
          filename: "../malicious.db",
          query: "SELECT * FROM users",
        },
        expectedError: "Invalid filename",
      },
      {
        endpoint: "/api/query",
        method: "POST",
        data: {
          filename,
          query: "DROP TABLE users",
        },
        expectedError: "operations are not allowed",
      },
    ];

    for (const testCase of errorTests) {
      let response;
      if (testCase.method === "GET") {
        response = await page.request.get(testCase.url);
      } else {
        response = await page.request.post(testCase.endpoint, {
          data: JSON.stringify(testCase.data),
          headers: { "Content-Type": "application/json" },
        });
      }

      const responseBody = await response.json();

      // Verify consistent error response format
      expect(response.status()).toBe(400);
      expect(responseBody).toHaveProperty("error");
      expect(typeof responseBody.error).toBe("string");
      expect(responseBody.error).toMatch(new RegExp(testCase.expectedError));
      expect(response.headers()["content-type"]).toMatch(/application\/json/);
    }
  });
});
