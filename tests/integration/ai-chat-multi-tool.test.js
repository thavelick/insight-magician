import { test, expect } from "@playwright/test";
import { setupDatabaseWithUpload, runQueryInWidget, addWidget } from "../helpers/integration.js";

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
      if (!body.message.includes("tool_call_id")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "",
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
            message: "Mock AI: Found 1 table (users) and 0 widgets on dashboard",
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
    await expect(page.locator(".ai-chat-message-assistant").last()).toContainText(
      "Mock AI: Found 1 table",
    );
    await expect(page.locator(".ai-chat-message-assistant").last()).toContainText(
      "0 widgets",
    );
  });

  test("Widget listing tool correctly reads real widget state", async ({ page }) => {
    // Set up widget state directly in sessionStorage (simulating real widget state)
    await page.evaluate(() => {
      const mockWidgetState = [
        {
          id: 1,
          title: "Test User Widget",
          widgetType: "data-table",
          query: "SELECT * FROM users LIMIT 10",
          width: 2,
          height: 2,
          results: { rows: [["data1"], ["data2"]], columns: ["col1", "col2"] },
          isFlipped: false
        }
      ];
      sessionStorage.setItem("widgets", JSON.stringify(mockWidgetState));
    });

    // Now intercept the API call to examine what our tool actually returns
    let actualToolResult = null;
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      // Mock AI requesting the list_widgets tool
      if (!body.message.includes("tool_call_id")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json", 
          body: JSON.stringify({
            success: true,
            message: "",
            toolCalls: [{
              id: "call_1",
              function: {
                name: "list_widgets",
                arguments: "{}"
              }
            }]
          })
        });
      } else {
        // This is the second call with tool results - capture what our tool actually returned
        console.log("Second API call - looking for tool messages in:", body.chatHistory.map(m => m.role));
        
        // Look for the most recent tool message
        const toolMessages = body.chatHistory.filter(msg => msg.role === "tool");
        if (toolMessages.length > 0) {
          const latestToolMessage = toolMessages[toolMessages.length - 1];
          console.log("Found tool message:", latestToolMessage.content.substring(0, 200));
          actualToolResult = JSON.parse(latestToolMessage.content);
        } else {
          console.log("No tool messages found in chat history");
        }
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Tool executed, result captured: " + (actualToolResult ? "yes" : "no"),
          })
        });
      }
    });

    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");

    // Wait for the full tool execution cycle
    await expect(page.locator(".ai-chat-message-assistant").last()).toBeVisible();

    // Verify our tool returned the correct widget data
    expect(actualToolResult).toBeTruthy();
    expect(actualToolResult.success).toBe(true);
    expect(actualToolResult.action).toBe("widgets_listed");
    expect(actualToolResult.data.totalWidgets).toBe(1);
    
    const widget = actualToolResult.data.widgets[0];
    expect(widget.title).toBe("Test User Widget");
    expect(widget.type).toBe("data-table");
    expect(widget.query).toBe("SELECT * FROM users LIMIT 10");
    expect(widget.hasResults).toBe(true);
    expect(widget.status).toBe("showing data");
  });

  test("AI handles widget listing errors gracefully", async ({ page }) => {
    // Mock AI API response with widget listing error
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "",
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
          message: "Mock AI: Error accessing widget data - Failed to access widget data",
        }),
      });
    });

    // AI chat should be visible by default
    await expect(page.locator(".ai-chat-sidebar")).toBeVisible();

    // Send message that would trigger widget listing
    await page.fill(".ai-chat-input", "Show me my widgets");
    await page.click(".ai-chat-send");

    // Wait for error response
    await expect(page.locator(".ai-chat-message-assistant").last()).toContainText(
      "Mock AI: Error accessing widget data",
    );
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
            message: "",
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
            message: "",
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

    await expect(page.locator(".ai-chat-message-assistant").last()).toContainText(
      "Mock AI: Schema tool - 1 table",
    );

    // Second question - about widgets
    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");

    await expect(page.locator(".ai-chat-message-assistant").last()).toContainText(
      "Mock AI: Widget tool - 0 widgets",
    );
  });

  test("Widget listing tool reflects different widget states", async ({
    page,
  }) => {
    // Set up mixed widget state - one with data, one empty
    await page.evaluate(() => {
      const mockWidgetState = [
        {
          id: 1,
          title: "User Data",
          widgetType: "data-table",
          query: "SELECT * FROM users",
          width: 2,
          height: 2,
          results: { rows: [["Alice"], ["Bob"]], columns: ["name"] },
          isFlipped: false
        },
        {
          id: 2,
          title: "Widget 2",
          widgetType: "data-table", 
          query: "",
          width: 1,
          height: 1,
          results: null,
          isFlipped: true
        }
      ];
      sessionStorage.setItem("widgets", JSON.stringify(mockWidgetState));
    });

    // Now capture what our tool actually returns for the current state
    let actualToolResult = null;
    await page.route("**/api/chat", async (route) => {
      const request = await route.request();
      const body = await request.postDataJSON();

      if (!body.message.includes("tool_call_id")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json", 
          body: JSON.stringify({
            success: true,
            message: "",
            toolCalls: [{
              id: "call_1",
              function: {
                name: "list_widgets",
                arguments: "{}"
              }
            }]
          })
        });
      } else {
        const toolMessage = body.chatHistory.find(msg => msg.role === "tool");
        if (toolMessage) {
          actualToolResult = JSON.parse(toolMessage.content);
        }
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Found " + actualToolResult.data.totalWidgets + " widgets",
          })
        });
      }
    });

    await page.fill(".ai-chat-input", "What widgets do I have?");
    await page.click(".ai-chat-send");
    await expect(page.locator(".ai-chat-message-assistant").last()).toBeVisible();

    // Verify our tool correctly detected 2 widgets with different states
    expect(actualToolResult.data.totalWidgets).toBe(2);
    
    const widgets = actualToolResult.data.widgets;
    
    // First widget should have data
    const widget1 = widgets.find(w => w.title === "User Data");
    expect(widget1).toBeTruthy();
    expect(widget1.hasResults).toBe(true);
    expect(widget1.status).toBe("showing data");
    expect(widget1.isInEditMode).toBe(false);
    
    // Second widget should be empty and in edit mode
    const widget2 = widgets.find(w => w.title === "Widget 2");
    expect(widget2).toBeTruthy();
    expect(widget2.hasResults).toBe(false);
    expect(widget2.status).toBe("empty (no query set)");
    expect(widget2.isInEditMode).toBe(true);
    
    // Summary should reflect the mixed state
    expect(actualToolResult.data.summary).toContain("2 widgets");
    expect(actualToolResult.data.summary).toContain("1 showing data, 1 need queries");
  });
});
