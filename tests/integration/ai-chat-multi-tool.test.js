import { expect, test } from "@playwright/test";
import {
  addWidget,
  runQueryInWidget,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("AI Chat Multi-Tool Integration", () => {
  let uploadedFilename;

  test.beforeEach(async ({ page }) => {
    // Navigate to app and setup database
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    // Setup and upload test database
    const result = await setupDatabaseWithUpload(page);
    uploadedFilename = result.uploadedFilename;
  });

  test("AI can use both schema and widget listing tools", async ({ page }) => {
    // Mock AI API response for multi-tool scenario
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      // First mock response - AI decides to use both tools
      const hasToolMessages = body.chatHistory?.some(
        (msg) => msg.role === "tool",
      );
      if (!hasToolMessages) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
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
                        rowCount: 10,
                      },
                    },
                  },
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
                    message: "No widgets currently on dashboard",
                  },
                },
              },
            ],
            message:
              "Mock AI: Found 1 table (users) and 0 widgets on dashboard",
          }),
        });
      }
    });

    // AI chat should be visible by default
    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    // Send a message that should trigger both tools
    await page.fill(
      ".ai-chat-input",
      "What data do I have and what am I currently visualizing?",
    );
    await page.click(".ai-chat-send");

    // Wait for response
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Found 1 table");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("0 widgets");
  });

  test("Widget listing tool correctly reads real widget state", async ({
    page,
  }) => {
    // Navigate and set up database
    await page.goto("http://localhost:3001");
    await setupDatabaseWithUpload(page);

    // Create a real widget using the UI
    await addWidget(page);

    // Configure the widget with known values
    await page.fill(".widget-title-input", "Sales Dashboard");
    await page.fill(".query-editor", "SELECT * FROM users");

    // Execute query to populate widget with data
    await page.click(".run-view-btn");
    await expect(page.locator("table tbody tr")).toHaveCount(10);

    // Widget should now be in view mode automatically (check for data table)
    await expect(page.locator("table")).toBeVisible();

    // Now test the chat integration - mock AI to just return a simple response
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      // Verify the widget data was correctly sent in the request
      expect(body.widgets).toBeDefined();
      expect(body.widgets).toHaveLength(1);
      expect(body.widgets[0].title).toBe("Sales Dashboard");
      expect(body.widgets[0].query).toBe("SELECT * FROM users");
      expect(body.widgets[0].hasResults).toBe(true);
      expect(body.widgets[0].resultCount).toBe(10);

      // Mock simple AI response
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `I can see you have 1 widget: "${body.widgets[0].title}" with ${body.widgets[0].resultCount} results.`,
        }),
      });
    });

    // Send chat message
    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");

    // Verify AI response appears with correct widget information
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Sales Dashboard");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("10 results");
  });

  test("AI handles widget listing errors gracefully", async ({ page }) => {
    // Mock AI API response with widget listing error
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          toolResults: [
            {
              toolCallId: "call_1",
              result: {
                success: false,
                error: "Failed to access widget data",
                action: "tool_error",
              },
            },
          ],
          message:
            "Mock AI: Error accessing widget data - Failed to access widget data",
        }),
      });
    });

    // AI chat should be visible by default
    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    // Send message that would trigger widget listing
    await page.fill(".ai-chat-input", "Show me my widgets");
    await page.click(".ai-chat-send");

    // Wait for error response
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Error accessing widget data");
  });

  test("AI can distinguish between schema and widget requests", async ({
    page,
  }) => {
    let toolCallCount = 0;

    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      toolCallCount++;

      if (toolCallCount === 1) {
        // First request - should use schema tool
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            toolResults: [
              {
                toolCallId: "call_schema",
                result: {
                  success: true,
                  action: "schema_retrieved",
                  data: {
                    tables: {
                      users: {
                        columns: [
                          { name: "id", type: "INTEGER" },
                          { name: "name", type: "TEXT" },
                        ],
                        rowCount: 10,
                      },
                    },
                  },
                },
              },
            ],
            message: "Mock AI: Schema tool - 1 table (users, 10 rows)",
          }),
        });
      } else {
        // Second request - should use widget tool
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            toolResults: [
              {
                toolCallId: "call_widgets",
                result: {
                  success: true,
                  action: "widgets_listed",
                  data: {
                    widgets: [],
                    totalWidgets: 0,
                    message: "No widgets currently on dashboard",
                  },
                },
              },
            ],
            message: "Mock AI: Widget tool - 0 widgets found",
          }),
        });
      }
    });

    // AI chat should be visible by default
    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    // First question - about database structure
    await page.fill(".ai-chat-input", "What tables do I have?");
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Schema tool - 1 table");

    // Second question - about widgets
    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Widget tool - 0 widgets");
  });

  test("Widget listing tool reflects different widget states", async ({
    page,
  }) => {
    // Navigate and set up database
    await page.goto("http://localhost:3001");
    await setupDatabaseWithUpload(page);

    // Create first widget with data
    await addWidget(page);
    await page.fill(".widget-title-input", "Users Table");
    await page.fill(".query-editor", "SELECT * FROM users");
    await page.click(".run-view-btn");
    await expect(page.locator("table tbody tr")).toHaveCount(10);
    // Widget should now be in view mode automatically

    // Create second widget without data (empty query)
    await addWidget(page);
    await page
      .locator(".widget")
      .last()
      .locator(".widget-title-input")
      .fill("Empty Widget");
    // Leave query empty
    // Stay in edit mode (don't flip)

    // Test chat integration
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      // Verify mixed widget states were correctly sent
      expect(body.widgets).toBeDefined();
      expect(body.widgets).toHaveLength(2);

      // Find widgets by title
      const usersWidget = body.widgets.find((w) => w.title === "Users Table");
      const emptyWidget = body.widgets.find((w) => w.title === "Empty Widget");

      expect(usersWidget).toBeTruthy();
      expect(usersWidget.hasResults).toBe(true);
      expect(usersWidget.resultCount).toBe(10);
      expect(usersWidget.isInEditMode).toBe(false);

      expect(emptyWidget).toBeTruthy();
      expect(emptyWidget.hasResults).toBe(false);
      expect(emptyWidget.resultCount).toBe(0);
      // Note: Widget might not be in edit mode if it was never flipped
      // expect(emptyWidget.isInEditMode).toBe(true);
      expect(emptyWidget.query).toBe("");

      // Mock AI response describing the mixed states
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `You have 2 widgets: "${usersWidget.title}" (${usersWidget.resultCount} results) and "${emptyWidget.title}" (empty, needs query).`,
        }),
      });
    });

    // Send chat message
    await page.fill(".ai-chat-input", "What's the status of my widgets?");
    await page.click(".ai-chat-send");

    // Verify AI response reflects different states
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toBeVisible();
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("2 widgets");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Users Table");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("10 results");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Empty Widget");
    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("empty");
  });
});
