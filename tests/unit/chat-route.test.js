import { test, expect, mock } from "bun:test";
import { handleChat } from "../../routes/chat.js";

function createMockRequest(body) {
  return {
    json: () => Promise.resolve(body),
  };
}

async function getResponseData(response) {
  const text = await response.text();
  return JSON.parse(text);
}

// Create a mock OpenRouterClient class
function createMockOpenRouterClient(mockResponse) {
  return class MockOpenRouterClient {
    constructor() {
      this.createChatCompletion = mock(() => Promise.resolve(mockResponse));
    }
  };
}

test("handleChat returns error for missing message", async () => {
  const request = createMockRequest({});
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Missing required parameter: message");
});

test("handleChat returns error for non-string message", async () => {
  const request = createMockRequest({ message: 123 });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Missing required parameter: message");
});

test("handleChat returns error for too long message", async () => {
  const longMessage = "a".repeat(4001); // Exceeds 4000 char limit
  const request = createMockRequest({ message: longMessage });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Message too long. Maximum length: 4000 characters");
});

test("handleChat returns error for non-array chatHistory", async () => {
  const request = createMockRequest({
    message: "Hello",
    chatHistory: "not an array",
  });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("chatHistory must be an array");
});

test("handleChat returns error for too long chatHistory", async () => {
  const longHistory = Array(301).fill({ role: "user", content: "test" });
  const request = createMockRequest({
    message: "Hello",
    chatHistory: longHistory,
  });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Chat history too long. Maximum messages: 300");
});

test("handleChat returns error for invalid chatHistory message structure", async () => {
  const request = createMockRequest({
    message: "Hello",
    chatHistory: [{ role: "user" }], // Missing content
  });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe(
    "Invalid chat history format. Each message must have role and content",
  );
});

test("handleChat returns error for invalid message role", async () => {
  const request = createMockRequest({
    message: "Hello",
    chatHistory: [{ role: "admin", content: "test" }], // Invalid role
  });
  const mockClient = createMockOpenRouterClient({ success: true, message: "test" });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe(
    'Invalid message role. Must be "user" or "assistant"',
  );
});

test("handleChat succeeds with valid input and no history", async () => {
  const mockResponse = {
    success: true,
    message: "Test AI response",
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
  };
  
  const request = createMockRequest({
    message: "Hello, how are you?",
  });
  const mockClient = createMockOpenRouterClient(mockResponse);
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.message).toBe("Test AI response");
  expect(data.usage).toBeDefined();
});

test("handleChat succeeds with valid input and chat history", async () => {
  const mockResponse = {
    success: true,
    message: "Test AI response with history",
    usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
  };

  const request = createMockRequest({
    message: "Follow up question",
    chatHistory: [
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer" },
    ],
  });
  const mockClient = createMockOpenRouterClient(mockResponse);
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.message).toBe("Test AI response with history");
});

test("handleChat handles OpenRouter API failure", async () => {
  const mockResponse = {
    success: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMIT"
  };

  const request = createMockRequest({
    message: "Hello",
  });
  const mockClient = createMockOpenRouterClient(mockResponse);
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(503);
  expect(data.error).toBe("AI service temporarily unavailable");
  expect(data.type).toBe("ai_error");
});

test("handleChat handles client construction error", async () => {
  class FailingClient {
    constructor() {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
  }

  const request = createMockRequest({
    message: "Hello",
  });
  const response = await handleChat(request, FailingClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(500);
  expect(data.error).toBe("Internal server error");
  expect(data.type).toBe("server_error");
});