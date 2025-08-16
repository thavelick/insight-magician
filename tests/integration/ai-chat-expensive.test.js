import { expect, test } from "@playwright/test";

test.describe("AI Chat Real API Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no API key available
    if (!process.env.OPENROUTER_API_KEY) {
      test.skip(true, 'OPENROUTER_API_KEY not available');
    }

    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

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

  test("should handle real AI conversation with OpenRouter", { tag: '@expensive' }, async ({ page }) => {
    const userMessage = "Hello! Please respond with exactly 'Test successful' and nothing else.";

    // Send message and wait for AI response
    await sendChatMessage(page, userMessage);
    
    // Verify user message appears
    await verifyMessageInChat(page, userMessage, "user");
    
    // Wait for AI response (real API call may take longer)
    await expect(page.locator(".ai-chat-message-assistant")).toBeVisible({ timeout: 10000 });
    
    // Verify we got some AI response (can't predict exact content from real AI)
    const assistantMessages = page.locator(".ai-chat-message-assistant");
    await expect(assistantMessages).toHaveCount(1);
    
    // Verify the response contains some text
    const responseText = await assistantMessages.first().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText.length).toBeGreaterThan(0);
    
    // Verify input is re-enabled after response
    await expect(page.locator(".ai-chat-input")).not.toBeDisabled();
    await expect(page.locator(".ai-chat-send")).not.toBeDisabled();
  });

  test("should maintain chat history in real conversation", { tag: '@expensive' }, async ({ page }) => {
    const message1 = "Say 'first' and nothing else.";
    const message2 = "Say 'second' and nothing else.";

    // Send first message
    await sendChatMessage(page, message1);
    await verifyMessageInChat(page, message1, "user");
    await expect(page.locator(".ai-chat-message-assistant")).toHaveCount(1, { timeout: 10000 });

    // Send second message
    await sendChatMessage(page, message2);
    await verifyMessageInChat(page, message2, "user");
    await expect(page.locator(".ai-chat-message-assistant")).toHaveCount(2, { timeout: 10000 });

    // Verify chat history includes both user messages and both AI responses
    await expect(page.locator(".ai-chat-message-user")).toHaveCount(2);
    await expect(page.locator(".ai-chat-message-assistant")).toHaveCount(2);

    // Reload page and verify history persists
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    
    // History should be restored from sessionStorage
    await expect(page.locator(".ai-chat-message-user")).toHaveCount(2);
    await expect(page.locator(".ai-chat-message-assistant")).toHaveCount(2);
  });
});