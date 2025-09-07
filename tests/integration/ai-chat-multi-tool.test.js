import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import {
  addWidget,
  runQueryInWidget,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("AI Chat Multi-Tool Integration", () => {
  let uploadedFilename;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    await authenticateUser(page);

    const result = await setupDatabaseWithUpload(page);
    uploadedFilename = result.uploadedFilename;
  });

  test("AI can use both schema and widget listing tools", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

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

    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    await page.fill(
      ".ai-chat-input",
      "What data do I have and what am I currently visualizing?",
    );
    await page.click(".ai-chat-send");
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
    await page.goto("http://localhost:3001");
    await setupDatabaseWithUpload(page);

    await addWidget(page);
    await page.fill(".widget-title-input", "Sales Dashboard");
    await page.fill(".query-editor", "SELECT * FROM users");
    await page.click(".run-view-btn");
    await expect(page.locator("table tbody tr")).toHaveCount(10);
    await expect(page.locator("table")).toBeVisible();
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      expect(body.widgets).toBeDefined();
      expect(body.widgets).toHaveLength(1);
      expect(body.widgets[0].title).toBe("Sales Dashboard");
      expect(body.widgets[0].query).toBe("SELECT * FROM users");
      expect(body.widgets[0].hasResults).toBe(true);
      expect(body.widgets[0].resultCount).toBe(10);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `I can see you have 1 widget: "${body.widgets[0].title}" with ${body.widgets[0].resultCount} results.`,
        }),
      });
    });

    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");
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

    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();
    await page.fill(".ai-chat-input", "Show me my widgets");
    await page.click(".ai-chat-send");
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

    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    await page.fill(".ai-chat-input", "What tables do I have?");
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Schema tool - 1 table");

    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");

    await expect(
      page.locator(".ai-chat-message-assistant").last(),
    ).toContainText("Mock AI: Widget tool - 0 widgets");
  });

  test("Widget listing tool reflects different widget states", async ({
    page,
  }) => {
    await page.goto("http://localhost:3001");
    await setupDatabaseWithUpload(page);

    await addWidget(page);
    await page.fill(".widget-title-input", "Users Table");
    await page.fill(".query-editor", "SELECT * FROM users");
    await page.click(".run-view-btn");
    await expect(page.locator("table tbody tr")).toHaveCount(10);

    await addWidget(page);
    await page
      .locator(".widget")
      .last()
      .locator(".widget-title-input")
      .fill("Empty Widget");
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      expect(body.widgets).toBeDefined();
      expect(body.widgets).toHaveLength(2);

      const usersWidget = body.widgets.find((w) => w.title === "Users Table");
      const emptyWidget = body.widgets.find((w) => w.title === "Empty Widget");

      expect(usersWidget).toBeTruthy();
      expect(usersWidget.hasResults).toBe(true);
      expect(usersWidget.resultCount).toBe(10);
      expect(usersWidget.isInEditMode).toBe(false);

      expect(emptyWidget).toBeTruthy();
      expect(emptyWidget.hasResults).toBe(false);
      expect(emptyWidget.resultCount).toBe(0);
      expect(emptyWidget.query).toBe("");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `You have 2 widgets: "${usersWidget.title}" (${usersWidget.resultCount} results) and "${emptyWidget.title}" (empty, needs query).`,
        }),
      });
    });

    await page.fill(".ai-chat-input", "What's the status of my widgets?");
    await page.click(".ai-chat-send");
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
