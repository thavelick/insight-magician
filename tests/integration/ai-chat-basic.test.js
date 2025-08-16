import { expect, test } from "@playwright/test";

test.describe("AI Chat Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
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
      // Verify content is pushed to the right
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

  test("should echo user messages", async ({ page }) => {
    const testMessage = "Hello, AI!";

    await sendChatMessage(page, testMessage);
    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(page, `Echo: ${testMessage}`, "assistant");
    await expect(page.locator(".ai-chat-input")).toHaveValue("");
  });

  test("should handle Enter key to send messages", async ({ page }) => {
    const testMessage = "Testing Enter key";

    await page.fill(".ai-chat-input", testMessage);
    await page.press(".ai-chat-input", "Enter");

    await verifyMessageInChat(page, testMessage, "user");
    await verifyMessageInChat(page, `Echo: ${testMessage}`, "assistant");
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
    await verifyMessageInChat(page, `Echo: ${message1}`, "assistant");

    await sendChatMessage(page, message2);
    await verifyMessageInChat(page, message2, "user");
    await verifyMessageInChat(page, `Echo: ${message2}`, "assistant");

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await verifyMessageInChat(page, message1, "user");
    await verifyMessageInChat(page, `Echo: ${message1}`, "assistant");
    await verifyMessageInChat(page, message2, "user");
    await verifyMessageInChat(page, `Echo: ${message2}`, "assistant");
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
      `.ai-chat-message-assistant:has-text("Echo: ${testMessage}")`,
    );
    await expect(assistantMessage).toBeVisible();
    await expect(assistantMessage).toHaveCSS("align-self", "flex-start");
  });
});
