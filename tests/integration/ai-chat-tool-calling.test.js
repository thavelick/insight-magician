import { expect, test } from "@playwright/test";

test.describe("AI Chat Tool Calling Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AI chat API endpoint with tool calling support
    await page.route("/api/chat", async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData());

      // Simulate tool calling behavior based on the message
      let mockResponse;

      if (
        postData.message.toLowerCase().includes("schema") ||
        postData.message.toLowerCase().includes("tables") ||
        postData.message.toLowerCase().includes("database")
      ) {
        // Simulate AI requesting schema tool
        mockResponse = {
          success: true,
          message:
            "I've retrieved your database schema. Your database contains 2 tables: users with 150 rows and posts with 1200 rows.",
          usage: { prompt_tokens: 25, completion_tokens: 18, total_tokens: 43 },
          toolResults: [
            {
              toolCallId: "call_123",
              result: {
                success: true,
                action: "schema_fetched",
                data: {
                  schema: {
                    users: {
                      columns: [
                        { name: "id", type: "INTEGER", primaryKey: true },
                        { name: "name", type: "TEXT", primaryKey: false },
                        { name: "email", type: "TEXT", primaryKey: false },
                      ],
                      rowCount: 150,
                    },
                    posts: {
                      columns: [
                        { name: "id", type: "INTEGER", primaryKey: true },
                        { name: "title", type: "TEXT", primaryKey: false },
                        { name: "user_id", type: "INTEGER", primaryKey: false },
                      ],
                      rowCount: 1200,
                    },
                  },
                  summary:
                    "Database contains 2 tables with 1350 total rows. Tables: users, posts.",
                  tableNames: ["users", "posts"],
                },
              },
            },
          ],
        };
      } else {
        // Regular AI response without tools
        mockResponse = {
          success: true,
          message: `AI response to: ${postData.message}`,
          usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
        };
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper function to upload a test database
  async function uploadTestDatabase(page) {
    // Create a minimal test database file
    const testDbContent = Buffer.from(
      [
        0x53,
        0x51,
        0x4c,
        0x69,
        0x74,
        0x65,
        0x20,
        0x66, // SQLite format header
        0x6f,
        0x72,
        0x6d,
        0x61,
        0x74,
        0x20,
        0x33,
        0x00,
      ].concat(new Array(4080).fill(0)),
    ); // Minimal valid SQLite header

    // Mock the upload endpoints
    await page.route("/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          filename: "test.db",
          message: "Database uploaded successfully",
        }),
      });
    });

    await page.route("/api/schema*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          schema: {
            users: {
              columns: [
                { name: "id", type: "INTEGER", primaryKey: true },
                { name: "name", type: "TEXT", primaryKey: false },
                { name: "email", type: "TEXT", primaryKey: false },
              ],
              rowCount: 150,
            },
            posts: {
              columns: [
                { name: "id", type: "INTEGER", primaryKey: true },
                { name: "title", type: "TEXT", primaryKey: false },
                { name: "user_id", type: "INTEGER", primaryKey: false },
              ],
              rowCount: 1200,
            },
          },
        }),
      });
    });

    // Upload the database
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.db",
      mimeType: "application/x-sqlite3",
      buffer: testDbContent,
    });

    // Wait for upload to complete
    await expect(page.locator("text=Database loaded")).toBeVisible();
  }

  // Helper function to send a message in AI chat
  async function sendChatMessage(page, message) {
    await page.fill(".ai-chat-input", message);
    await page.click(".ai-chat-send");
  }

  // Helper function to verify message appears in chat
  async function verifyMessageInChat(page, message, role) {
    const messageLocator = page.locator(`.ai-chat-message-${role}`).filter({
      hasText: message,
    });
    await expect(messageLocator).toBeVisible();
  }

  test("should handle AI responses without tool calls", async ({ page }) => {
    await uploadTestDatabase(page);

    const testMessage = "Hello, how are you?";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      `AI response to: ${testMessage}`,
      "assistant",
    );
  });

  test("should handle AI responses with schema tool calls", async ({
    page,
  }) => {
    await uploadTestDatabase(page);

    const testMessage = "What tables do I have in my database?";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      "I've retrieved your database schema. Your database contains 2 tables: users with 150 rows and posts with 1200 rows.",
      "assistant",
    );
  });

  test("should handle schema-related queries", async ({ page }) => {
    await uploadTestDatabase(page);

    const testMessage = "Tell me about my database schema";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      "I've retrieved your database schema",
      "assistant",
    );
  });

  test("should handle queries about database structure", async ({ page }) => {
    await uploadTestDatabase(page);

    const testMessage = "What's in my database?";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(page, "database contains 2 tables", "assistant");
  });

  test("should work without database uploaded", async ({ page }) => {
    // Don't upload database, just test regular chat
    const testMessage = "Hello there!";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      `AI response to: ${testMessage}`,
      "assistant",
    );
  });

  test("should handle tool calls even without database", async ({ page }) => {
    // Test that schema queries work even without a database (should get appropriate error)
    await page.route("/api/chat", async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData());

      const mockResponse = {
        success: true,
        message:
          "I tried to check your database schema, but no database is currently loaded. Please upload a database first.",
        usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
        toolResults: [
          {
            toolCallId: "call_456",
            result: {
              success: false,
              action: "schema_error",
              error:
                "No database file available. Please upload a database first.",
            },
          },
        ],
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    const testMessage = "What tables do I have?";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      "no database is currently loaded",
      "assistant",
    );
  });

  test("should pass database path to API when database is loaded", async ({
    page,
  }) => {
    await uploadTestDatabase(page);

    // Intercept the API call to verify databasePath is included
    let apiCallData = null;
    await page.route("/api/chat", async (route) => {
      const request = route.request();
      apiCallData = JSON.parse(request.postData());

      const mockResponse = {
        success: true,
        message: "Database path received correctly",
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    await sendChatMessage(page, "Test message");

    // Verify database path was sent
    await page.waitForFunction(() => window.apiCallData !== null);
    const callData = await page.evaluate(() => window.apiCallData);

    // Set the intercepted data for verification
    await page.evaluate((data) => {
      window.apiCallData = data;
    }, apiCallData);

    expect(apiCallData.databasePath).toBe("./uploads/test.db");
    expect(apiCallData.message).toBe("Test message");
  });

  test("should handle API errors during tool execution", async ({ page }) => {
    await uploadTestDatabase(page);

    // Mock API error response
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Tool execution failed",
          success: false,
        }),
      });
    });

    const testMessage = "What's my schema?";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      "Sorry, I'm having trouble connecting right now. Please try again.",
      "assistant",
    );
  });
});
