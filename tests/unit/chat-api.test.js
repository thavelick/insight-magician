import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { ChatAPI } from "../../lib/chat-api.js";

// Mock fetch for API calls
let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = mock((url, options) => {
    if (url === "/api/chat") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: "Test AI response",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      });
    }
    return Promise.reject(new Error("Unexpected fetch call"));
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test("ChatAPI formatChatHistoryForAPI formats messages correctly", () => {
  const chatAPI = new ChatAPI();

  const messages = [
    {
      role: "user",
      content: "Hello",
      timestamp: "2023-01-01T00:00:00Z",
      id: "1",
    },
    {
      role: "assistant",
      content: "Hi there!",
      timestamp: "2023-01-01T00:00:01Z",
      id: "2",
    },
  ];

  const formatted = chatAPI.formatChatHistoryForAPI(messages);

  expect(formatted).toEqual([
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ]);
});

test("ChatAPI sendMessage calls API with correct parameters", async () => {
  const chatAPI = new ChatAPI();

  const message = "Test message";
  const chatHistory = [
    {
      role: "user",
      content: "Previous message",
      timestamp: "2023-01-01T00:00:00Z",
      id: "1",
    },
  ];

  const result = await chatAPI.sendMessage(message, chatHistory);

  expect(global.fetch).toHaveBeenCalledWith("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Test message",
      chatHistory: [{ role: "user", content: "Previous message" }],
    }),
  });

  expect(result).toEqual({
    message: "Test AI response",
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
});

test("ChatAPI sendMessage handles API errors", async () => {
  const chatAPI = new ChatAPI();

  // Mock fetch to return an error
  global.fetch = mock(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: "API Error" }),
    }),
  );

  await expect(chatAPI.sendMessage("Test", [])).rejects.toThrow("API Error");
});

test("ChatAPI sendMessage handles fetch failures", async () => {
  const chatAPI = new ChatAPI();

  // Mock fetch to throw an error
  global.fetch = mock(() => Promise.reject(new Error("Network error")));

  await expect(chatAPI.sendMessage("Test", [])).rejects.toThrow(
    "Network error",
  );
});

test("ChatAPI sendMessage handles missing error message", async () => {
  const chatAPI = new ChatAPI();

  // Mock fetch to return error without message
  global.fetch = mock(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({}),
    }),
  );

  await expect(chatAPI.sendMessage("Test", [])).rejects.toThrow(
    "Failed to get AI response",
  );
});
