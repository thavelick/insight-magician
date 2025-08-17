import { expect, test } from "@playwright/test";

test.describe("AI Chat Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AI chat API endpoint
    await page.route("/api/chat", async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData());

      // Simulate AI response based on the message
      const mockResponse = {
        success: true,
        message: `AI response to: ${postData.message}`,
        usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
      };

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

  // Helper function to verify AI chat button state
  async function verifyAIChatButton(page, visible) {
    if (visible) {
      await expect(page.locator("#ai-chat")).toBeVisible();
    } else {
      await expect(page.locator("#ai-chat")).toBeHidden();
    }
  }

  // Helper function to verify AI chat sidebar visibility and positioning
  async function verifyAIChatSidebar(page, visible) {
    if (visible) {
      await expect(page.locator(".ai-chat-sidebar")).toBeVisible();
      await expect(page.locator(".ai-chat-sidebar")).toHaveClass(/visible/);
      await expect(page.locator("body")).toHaveClass(/ai-chat-open/);
    } else {
      await expect(page.locator(".ai-chat-sidebar")).not.toHaveClass(/visible/);
      await expect(page.locator("body")).not.toHaveClass(/ai-chat-open/);
    }
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

  test("should show AI chat button in header", async ({ page }) => {
    await verifyAIChatButton(page, true);
    await expect(page.locator("#ai-chat")).toContainText("🤖 AI Chat");
  });

  test("should show AI chat sidebar by default", async ({ page }) => {
    await verifyAIChatSidebar(page, true);
    await expect(page.locator(".ai-chat-header h3")).toContainText("AI Chat");
    await expect(page.locator(".close-ai-chat")).toBeVisible();
    await expect(page.locator(".ai-chat-messages")).toBeVisible();
    await expect(page.locator(".ai-chat-input")).toBeVisible();
    await expect(page.locator(".ai-chat-send")).toBeVisible();
  });

  test("should hide and show AI chat sidebar with button clicks", async ({
    page,
  }) => {
    await verifyAIChatSidebar(page, true);

    await page.click(".close-ai-chat");
    await verifyAIChatSidebar(page, false);

    await page.click("#ai-chat");
    await verifyAIChatSidebar(page, true);
  });

  test("should send user messages and receive AI responses", async ({
    page,
  }) => {
    const testMessage = "Hello, AI!";

    await sendChatMessage(page, testMessage);
    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      `AI response to: ${testMessage}`,
      "assistant",
    );
    await expect(page.locator(".ai-chat-input")).toHaveValue("");
  });

  test("should handle Enter key to send messages", async ({ page }) => {
    const testMessage = "Testing Enter key";

    await page.fill(".ai-chat-input", testMessage);
    await page.press(".ai-chat-input", "Enter");

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      `AI response to: ${testMessage}`,
      "assistant",
    );
  });

  test("should handle Shift+Enter for new lines", async ({ page }) => {
    const multilineMessage = "Line 1\nLine 2";

    await page.fill(".ai-chat-input", "Line 1");
    await page.press(".ai-chat-input", "Shift+Enter");
    await page.type(".ai-chat-input", "Line 2");
    await page.press(".ai-chat-input", "Enter");
    await verifyMessageInChat(page, multilineMessage, "user");
  });

  test("should persist chat history across page reloads", async ({ page }) => {
    const message1 = "First message";
    const message2 = "Second message";
    await sendChatMessage(page, message1);
    await verifyMessageInChat(page, message1, "user");
    await verifyMessageInChat(page, `AI response to: ${message1}`, "assistant");

    await sendChatMessage(page, message2);
    await verifyMessageInChat(page, message2, "user");
    await verifyMessageInChat(page, `AI response to: ${message2}`, "assistant");

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await verifyMessageInChat(page, message1, "user");
    await verifyMessageInChat(page, `AI response to: ${message1}`, "assistant");
    await verifyMessageInChat(page, message2, "user");
    await verifyMessageInChat(page, `AI response to: ${message2}`, "assistant");
  });

  test("should focus input when sidebar opens", async ({ page }) => {
    await page.click(".close-ai-chat");
    await verifyAIChatSidebar(page, false);

    await page.click("#ai-chat");
    await verifyAIChatSidebar(page, true);
    await expect(page.locator(".ai-chat-input")).toBeFocused();
  });

  test("should handle mobile responsiveness", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await verifyAIChatSidebar(page, true);

    // On mobile, sidebar should be full width and body should not scroll
    await expect(page.locator(".ai-chat-sidebar")).toHaveCSS("width", "375px"); // 100vw
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.click(".close-ai-chat");
    await verifyAIChatSidebar(page, false);

    await page.click("#ai-chat");
    await verifyAIChatSidebar(page, true);
  });

  test("should not send empty messages", async ({ page }) => {
    const initialMessageCount = await page.locator(".ai-chat-message").count();

    await page.click(".ai-chat-send");
    await expect(page.locator(".ai-chat-message")).toHaveCount(
      initialMessageCount,
    );

    await page.press(".ai-chat-input", "Enter");
    await expect(page.locator(".ai-chat-message")).toHaveCount(
      initialMessageCount,
    );
  });

  test("should maintain message styling and structure", async ({ page }) => {
    const testMessage = "Styling test";

    await sendChatMessage(page, testMessage);

    const userMessage = page.locator(
      `.ai-chat-message-user:has-text("${testMessage}")`,
    );
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toHaveCSS("align-self", "flex-end");
    const assistantMessage = page.locator(
      `.ai-chat-message-assistant:has-text("AI response to: ${testMessage}")`,
    );
    await expect(assistantMessage).toBeVisible();
    await expect(assistantMessage).toHaveCSS("align-self", "flex-start");
  });

  test("should show loading indicator while waiting for AI response", async ({
    page,
  }) => {
    // Mock a slower API response
    await page.route("/api/chat", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      const request = route.request();
      const postData = JSON.parse(request.postData());

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `AI response to: ${postData.message}`,
          usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
        }),
      });
    });

    const testMessage = "Loading test";
    await page.fill(".ai-chat-input", testMessage);

    await page.click(".ai-chat-send");

    await expect(page.locator("#typing-indicator")).toBeVisible();
    await expect(page.locator("#typing-indicator")).toContainText(
      "AI is typing",
    );

    await expect(page.locator(".ai-chat-input")).toBeDisabled();
    await expect(page.locator(".ai-chat-send")).toBeDisabled();

    await verifyMessageInChat(
      page,
      `AI response to: ${testMessage}`,
      "assistant",
    );
    await expect(page.locator("#typing-indicator")).not.toBeVisible();

    await expect(page.locator(".ai-chat-input")).not.toBeDisabled();
    await expect(page.locator(".ai-chat-send")).not.toBeDisabled();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    const testMessage = "Error test";
    await sendChatMessage(page, testMessage);

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(
      page,
      "Sorry, I'm having trouble connecting right now. Please try again.",
      "assistant",
    );
  });

  test("should display message timestamps", async ({ page }) => {
    const testMessage = "Timestamp test";
    await sendChatMessage(page, testMessage);

    // Check that timestamp elements are present (should have 2: user + AI response)
    await expect(page.locator(".ai-chat-timestamp")).toHaveCount(2);

    // Should show "just now" for recent messages
    await expect(page.locator(".ai-chat-timestamp").first()).toContainText(
      "just now",
    );
  });

  test("should provide clear chat functionality", async ({ page }) => {
    // Send a couple messages first
    await sendChatMessage(page, "First message");
    await sendChatMessage(page, "Second message");

    // Verify messages are there
    await verifyMessageInChat(page, "First message", "user");
    await verifyMessageInChat(page, "Second message", "user");

    // Set up dialog handler before clicking
    page.on("dialog", (dialog) => dialog.accept());

    // Click the clear button
    await page.locator(".clear-ai-chat").click();

    // Wait for messages to be cleared
    await expect(page.locator(".ai-chat-message")).toHaveCount(0);

    // Verify chat history is cleared in storage
    const historyAfterClear = await page.evaluate(() => {
      return sessionStorage.getItem("ai-chat-history");
    });
    expect(historyAfterClear).toBe("[]");
  });

  test("should show enhanced error messages for specific error types", async ({
    page,
  }) => {
    // Test rate limiting error
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Too many requests. Please wait a moment and try again.",
        }),
      });
    });

    await sendChatMessage(page, "Rate limit test");
    await verifyMessageInChat(
      page,
      "⏳ Too many requests. Please wait a moment and try again.",
      "assistant",
    );

    // Test network error
    await page.route("/api/chat", async (route) => {
      await route.abort("failed");
    });

    await sendChatMessage(page, "Network test");
    await verifyMessageInChat(
      page,
      "⚠️ Network connection failed. Please check your internet connection and try again.",
      "assistant",
    );

    // Test authentication error (API key issue)
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Authentication failed. Please check your configuration.",
        }),
      });
    });

    await sendChatMessage(page, "Auth test");
    await verifyMessageInChat(
      page,
      "🔧 AI service configuration issue. Please try again later.",
      "assistant",
    );
  });

  test("should show proper message structure with wrappers", async ({
    page,
  }) => {
    const testMessage = "Structure test";
    await sendChatMessage(page, testMessage);

    // Check that messages are wrapped properly for timestamps (there will be multiple)
    await expect(page.locator(".ai-chat-message-wrapper")).toHaveCount(2); // User + AI response
    await expect(
      page.locator(".ai-chat-message-wrapper .ai-chat-message"),
    ).toHaveCount(2);
    await expect(
      page.locator(".ai-chat-message-wrapper .ai-chat-timestamp"),
    ).toHaveCount(2);

    // Check that specific elements are visible
    await expect(
      page.locator(".ai-chat-message-wrapper").first(),
    ).toBeVisible();
    await expect(
      page.locator(".ai-chat-message-wrapper .ai-chat-message").first(),
    ).toBeVisible();
    await expect(
      page.locator(".ai-chat-message-wrapper .ai-chat-timestamp").first(),
    ).toBeVisible();
  });
});
