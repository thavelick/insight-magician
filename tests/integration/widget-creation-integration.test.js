import { expect, test } from "@playwright/test";
import { setupDatabaseWithUpload } from "../helpers/integration.js";

test.describe("Widget Creation via AI Chat Integration", () => {
  async function sendChatMessage(page, message) {
    await page.fill(".ai-chat-input", message);
    await page.click(".ai-chat-send");
  }

  async function verifyMessageInChat(page, message, role) {
    const messageLocator = page.locator(`.ai-chat-message-${role}`).filter({
      hasText: message,
    });
    await expect(messageLocator).toBeVisible();
  }

  test("should send correct request format to chat API", async ({ page }) => {
    let capturedRequest = null;

    await page.goto("/");
    await setupDatabaseWithUpload(page);
    await page.route("/api/chat", async (route) => {
      capturedRequest = JSON.parse(route.request().postData());

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Mock AI response for testing",
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });
    });

    await page.click("#ai-chat");
    await sendChatMessage(page, "Create a widget");
    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.message).toBe("Create a widget");
    expect(capturedRequest.chatHistory).toBeDefined();
    expect(Array.isArray(capturedRequest.chatHistory)).toBe(true);
    expect(capturedRequest.databasePath).toBeDefined();
    expect(capturedRequest.widgets).toBeDefined();
    expect(Array.isArray(capturedRequest.widgets)).toBe(true);
  });

  test("should handle widget creation through tool results", async ({
    page,
  }) => {
    await page.goto("/");
    await setupDatabaseWithUpload(page);
    await page.route("/api/chat", async (route) => {
      const mockResponse = {
        success: true,
        message: "I've created a customer table widget for you.",
        toolResults: [
          {
            toolCallId: "call_123",
            result: {
              success: true,
              action: "widget_created",
              widgetConfig: {
                id: "widget_test_123",
                title: "Customer List",
                widgetType: "data-table",
                query: "SELECT name, email FROM users LIMIT 5",
                width: 3,
                height: 2,
                results: {
                  columns: ["name", "email"],
                  rows: [
                    ["Alice Johnson", "alice@example.com"],
                    ["Bob Smith", "bob@example.com"],
                  ],
                  totalRows: 2,
                  hasMore: false,
                },
              },
              message:
                'Successfully created data-table widget "Customer List" with 2 rows of data',
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    await page.click("#ai-chat");
    await expect(page.locator(".ai-chat-sidebar")).toHaveClass(/visible/);
    await sendChatMessage(page, "Create a table showing customer information");
    await verifyMessageInChat(
      page,
      "I've created a customer table widget for you.",
      "assistant",
    );

    await expect(page.locator(".widget")).toHaveCount(1);

    const widget = page.locator(".widget").first();
    await expect(widget.locator(".card-front .widget-header h4")).toContainText(
      "Customer List",
    );
    await expect(widget.locator("table")).toBeVisible();
  });

  test("should handle widget creation errors gracefully", async ({ page }) => {
    await page.goto("/");
    await setupDatabaseWithUpload(page);
    await page.route("/api/chat", async (route) => {
      const mockResponse = {
        success: true,
        message: "I encountered an error creating the widget.",
        toolResults: [
          {
            toolCallId: "call_123",
            result: {
              success: false,
              error: "Invalid SQL query: table 'nonexistent' does not exist",
            },
          },
        ],
        usage: { prompt_tokens: 40, completion_tokens: 25, total_tokens: 65 },
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    await page.click("#ai-chat");
    await sendChatMessage(page, "Create a widget from nonexistent table");
    await verifyMessageInChat(
      page,
      "I encountered an error creating the widget.",
      "assistant",
    );

    await expect(page.locator(".widget")).toHaveCount(0);
  });
});
