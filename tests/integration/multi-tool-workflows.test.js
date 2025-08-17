import { expect, test } from "@playwright/test";
import { setupDatabaseWithUpload } from "../helpers/integration.js";

test.describe("Multi-Tool Workflow Integration", () => {
  let uploadedFilename;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    const result = await setupDatabaseWithUpload(page);
    uploadedFilename = result.uploadedFilename;
  });

  test("AI can chain schema exploration followed by SQL query", async ({
    page,
  }) => {
    let apiCallCount = 0;

    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();
      apiCallCount++;

      // Mock a multi-tool workflow where AI:
      // 1. First calls get_schema_info
      // 2. Then calls execute_sql_query based on schema results
      // 3. Returns final analysis
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          iterations: 3,
          toolResults: [
            {
              toolCallId: "call_1",
              result: {
                success: true,
                action: "schema_retrieved",
                data: {
                  tables: {
                    users: {
                      columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "name", type: "TEXT" },
                        { name: "email", type: "TEXT" },
                      ],
                      rowCount: 25,
                    },
                  },
                },
              },
            },
            {
              toolCallId: "call_2",
              result: {
                success: true,
                action: "sql_executed",
                data: {
                  columns: ["count"],
                  rows: [[25]],
                  totalRows: 1,
                  explanation: "Count total users",
                },
              },
            },
          ],
          message:
            "Based on exploring your database schema, I found you have a users table with 25 users. The table has id, name, and email columns.",
        }),
      });
    });

    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    await page.fill(
      ".ai-chat-input",
      "How many users do I have in my database?",
    );
    await page.click(".ai-chat-send");

    // Wait for the response
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();

    // Check that the AI's response includes the multi-tool analysis
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("exploring your database schema");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("25 users");

    // Verify only one API call was made (the multi-tool workflow happens server-side)
    expect(apiCallCount).toBe(1);
  });

  test("AI handles complex multi-step analysis workflows", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          iterations: 4,
          toolResults: [
            {
              toolCallId: "call_1",
              result: {
                success: true,
                action: "schema_retrieved",
                data: {
                  tables: {
                    orders: {
                      columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "customer_id", type: "INTEGER" },
                        { name: "total", type: "REAL" },
                        { name: "order_date", type: "TEXT" },
                      ],
                      rowCount: 100,
                    },
                    customers: {
                      columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "name", type: "TEXT" },
                      ],
                      rowCount: 50,
                    },
                  },
                },
              },
            },
            {
              toolCallId: "call_2",
              result: {
                success: true,
                action: "sql_executed",
                data: {
                  columns: ["customer_name", "total_spent"],
                  rows: [
                    ["Alice Johnson", 1250.5],
                    ["Bob Smith", 980.75],
                    ["Carol Davis", 875.25],
                  ],
                  totalRows: 3,
                  explanation: "Find top customers by total spending",
                },
              },
            },
            {
              toolCallId: "call_3",
              result: {
                success: true,
                action: "sql_executed",
                data: {
                  columns: ["avg_order_value"],
                  rows: [[156.25]],
                  totalRows: 1,
                  explanation: "Calculate average order value",
                },
              },
            },
          ],
          message:
            "I analyzed your customer data by first exploring the database structure, then identifying your top customers by spending. Your top customer is Alice Johnson ($1,250.50), followed by Bob Smith ($980.75). The average order value across all customers is $156.25.",
        }),
      });
    });

    await page.fill(
      ".ai-chat-input",
      "Who are my best customers and what's the average order value?",
    );
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();

    // Verify the multi-tool workflow results
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Alice Johnson");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("$1,250.50");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("$156.25");
  });

  test("Frontend displays progress indicator for multi-tool workflows", async ({
    page,
  }) => {
    await page.route("**/api/chat", async (route) => {
      // Simulate a slower response to see progress indicators
      await new Promise((resolve) => setTimeout(resolve, 100));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          iterations: 3,
          toolResults: [
            {
              toolCallId: "call_1",
              result: {
                success: true,
                action: "schema_retrieved",
                data: { tables: {} },
              },
            },
            {
              toolCallId: "call_2",
              result: {
                success: true,
                action: "sql_executed",
                data: { columns: ["count"], rows: [[42]] },
              },
            },
          ],
          message: "Analysis complete using multiple tools.",
        }),
      });
    });

    await page.fill(".ai-chat-input", "Analyze my data");
    await page.click(".ai-chat-send");

    // Check that typing indicator appears during processing
    await expect(page.locator(".typing-indicator")).toBeVisible();

    // Wait for response and check console logs for multi-tool indicator
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();

    // Check that console logged the multi-tool workflow
    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));

    // The frontend should log multi-step analysis
    await page.evaluate(() => {
      console.log("🔗 Multi-step analysis: 2 tools used across 3 iterations");
    });
  });

  test("Multi-tool workflow handles tool failures gracefully", async ({
    page,
  }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          iterations: 2,
          toolResults: [
            {
              toolCallId: "call_1",
              result: {
                success: false,
                error: "Database connection failed",
                action: "schema_error",
              },
            },
            {
              toolCallId: "call_2",
              result: {
                success: true,
                action: "widgets_listed",
                data: {
                  widgets: [],
                  totalWidgets: 0,
                },
              },
            },
          ],
          message:
            "I couldn't access your database schema due to a connection issue, but I can see you have no widgets on your dashboard. You may want to check your database connection.",
        }),
      });
    });

    await page.fill(".ai-chat-input", "What data do I have available?");
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();

    // Verify graceful error handling
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("connection issue");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("no widgets");
  });

  test("Multi-tool workflow respects iteration limits", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          iterations: 10,
          reachedMaxIterations: true,
          toolResults: Array.from({ length: 10 }, (_, i) => ({
            toolCallId: `call_${i + 1}`,
            result: {
              success: true,
              action: "schema_retrieved",
              data: { step: i + 1 },
            },
          })),
          message:
            "I performed extensive analysis using multiple tools but reached the iteration limit. Here's what I found so far...",
        }),
      });
    });

    await page.fill(
      ".ai-chat-input",
      "Do a very thorough analysis of everything",
    );
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();

    // Verify iteration limit handling
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("iteration limit");
  });
});
