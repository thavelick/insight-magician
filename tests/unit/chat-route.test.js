import { expect, mock, test } from "bun:test";
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
  class MockOpenRouterClient {
    constructor() {
      this.createChatCompletion = mock(() => Promise.resolve(mockResponse));
    }
  }
  // Set the name property to match our dependency injection check
  Object.defineProperty(MockOpenRouterClient, "name", {
    value: "OpenRouterClient",
  });
  return MockOpenRouterClient;
}

test("handleChat returns error for missing message", async () => {
  const request = createMockRequest({});
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Missing required parameter: message");
});

test("handleChat returns error for non-string message", async () => {
  const request = createMockRequest({ message: 123 });
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Missing required parameter: message");
});

test("handleChat returns error for too long message", async () => {
  const longMessage = "a".repeat(4001); // Exceeds 4000 char limit
  const request = createMockRequest({ message: longMessage });
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(400);
  expect(data.error).toBe("Message too long");
});

test("handleChat returns error for non-array chatHistory", async () => {
  const request = createMockRequest({
    message: "Hello",
    chatHistory: "not an array",
  });
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
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
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
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
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
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
  const mockClient = createMockOpenRouterClient({
    success: true,
    message: "test",
  });
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
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
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
    usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
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

test("handleChat handles AI API failure", async () => {
  const mockResponse = {
    success: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMIT",
  };

  const request = createMockRequest({
    message: "Hello",
  });
  const mockClient = createMockOpenRouterClient(mockResponse);
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(503);
  expect(data.error).toBe("AI service temporarily unavailable");
});

test("handleChat handles client construction error", async () => {
  class FailingClient {
    constructor() {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
  }
  // Set the name property to match our dependency injection check
  Object.defineProperty(FailingClient, "name", { value: "OpenRouterClient" });

  const request = createMockRequest({
    message: "Hello",
  });
  const response = await handleChat(request, FailingClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(503);
  expect(data.error).toBe("AI service temporarily unavailable");
});

test("handleChat processes tool calls successfully", async () => {
  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "get_schema_info",
        arguments: "{}",
      },
    },
  ];

  // First response with tool calls
  const firstMockResponse = {
    success: true,
    message: "I'll check your database schema.",
    toolCalls: toolCalls,
    usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
  };

  // Second response after tool execution
  const secondMockResponse = {
    success: true,
    message: "Your database has 2 tables: users and posts.",
    usage: { prompt_tokens: 45, completion_tokens: 12, total_tokens: 57 },
  };

  let callCount = 0;
  function createMockOpenRouterClientWithToolCalls() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock(async (messages, tools) => {
          callCount++;
          if (callCount === 1) {
            // First call - return tool calls
            return firstMockResponse;
          }
          // Second call - process tool results
          return secondMockResponse;
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  const request = createMockRequest({
    message: "What tables do I have?",
    databasePath: "./uploads/test.db",
  });

  const mockClient = createMockOpenRouterClientWithToolCalls();
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.message).toBe("Your database has 2 tables: users and posts.");
  expect(data.toolResults).toBeDefined();
  expect(data.toolResults).toHaveLength(1);
  expect(data.toolResults[0].toolCallId).toBe("call_123");
});

test("handleChat handles tool execution errors", async () => {
  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "unknown_tool",
        arguments: "{}",
      },
    },
  ];

  const firstMockResponse = {
    success: true,
    message: "I'll use a tool to help.",
    toolCalls: toolCalls,
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };

  const secondMockResponse = {
    success: true,
    message: "Sorry, I encountered an error with that tool.",
    usage: { prompt_tokens: 25, completion_tokens: 8, total_tokens: 33 },
  };

  let callCount = 0;
  function createMockOpenRouterClientWithFailingTool() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock(async (messages, tools) => {
          callCount++;
          if (callCount === 1) {
            return firstMockResponse;
          }
          return secondMockResponse;
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  const request = createMockRequest({
    message: "Use unknown tool",
    databasePath: "./uploads/test.db",
  });

  const mockClient = createMockOpenRouterClientWithFailingTool();
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.toolResults).toBeDefined();
  expect(data.toolResults[0].result.success).toBe(false);
  expect(data.toolResults[0].result.error).toContain(
    "Tool 'unknown_tool' not found",
  );
});

test("handleChat handles second API call failure during tool processing", async () => {
  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "get_schema_info",
        arguments: "{}",
      },
    },
  ];

  const firstMockResponse = {
    success: true,
    message: "I'll check your schema.",
    toolCalls: toolCalls,
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };

  const secondMockResponse = {
    success: false,
    error: "Rate limit exceeded on second call",
  };

  let callCount = 0;
  function createMockOpenRouterClientWithSecondCallFailure() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock(async (messages, tools) => {
          callCount++;
          if (callCount === 1) {
            return firstMockResponse;
          }
          return secondMockResponse;
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  const request = createMockRequest({
    message: "What's my schema?",
    databasePath: "./uploads/test.db",
  });

  const mockClient = createMockOpenRouterClientWithSecondCallFailure();
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(503);
  expect(data.error).toBe("AI service temporarily unavailable");
});

// Multi-tool workflow tests
test("handleChat supports multi-tool workflows with multiple iterations", async () => {
  // Mock a workflow where AI calls schema tool, then SQL tool
  const schemaToolCall = {
    id: "call_1",
    function: {
      name: "get_schema_info",
      arguments: "{}",
    },
  };

  const sqlToolCall = {
    id: "call_2",
    function: {
      name: "execute_sql_query",
      arguments:
        '{"query": "SELECT COUNT(*) FROM users", "explanation": "Count users"}',
    },
  };

  let callCount = 0;
  function createMockMultiToolClient() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock((messages, tools) => {
          callCount++;
          if (callCount === 1) {
            // First call: AI requests schema tool
            return Promise.resolve({
              success: true,
              message: "Let me check your schema first.",
              toolCalls: [schemaToolCall],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            });
          }
          if (callCount === 2) {
            // Second call: AI requests SQL tool after seeing schema results
            return Promise.resolve({
              success: true,
              message: "Now let me query the data.",
              toolCalls: [sqlToolCall],
              usage: {
                prompt_tokens: 20,
                completion_tokens: 8,
                total_tokens: 28,
              },
            });
          }
          // Third call: AI provides final response
          return Promise.resolve({
            success: true,
            message: "You have 150 users in your database.",
            usage: {
              prompt_tokens: 30,
              completion_tokens: 12,
              total_tokens: 42,
            },
          });
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  const request = createMockRequest({
    message: "How many users do I have?",
    databasePath: "./uploads/test.db",
  });

  const mockClient = createMockMultiToolClient();
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.message).toBe("You have 150 users in your database.");
  expect(data.iterations).toBe(3);
  expect(data.toolResults).toHaveLength(2);
  expect(data.usage.total_tokens).toBe(85); // Sum of all API calls
  expect(callCount).toBe(3);
});

test("handleChat respects maximum iteration limit", async () => {
  // Mock AI that keeps requesting tools
  let callCount = 0;
  function createMockInfiniteToolClient() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock((messages, tools) => {
          callCount++;
          if (callCount <= 10) {
            // Keep requesting tools up to the limit
            return Promise.resolve({
              success: true,
              message: `Call ${callCount}`,
              toolCalls: [
                {
                  id: `call_${callCount}`,
                  function: {
                    name: "get_schema_info",
                    arguments: "{}",
                  },
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            });
          }
          // Final response after hitting limit
          return Promise.resolve({
            success: true,
            message: "Final response after max iterations.",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          });
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  const request = createMockRequest({
    message: "Keep analyzing",
    databasePath: "./uploads/test.db",
  });

  const mockClient = createMockInfiniteToolClient();
  const response = await handleChat(request, mockClient);
  const data = await getResponseData(response);

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.message).toBe("Final response after max iterations.");
  expect(data.iterations).toBe(10);
  expect(data.reachedMaxIterations).toBe(true);
  expect(data.toolResults).toHaveLength(10);
  expect(callCount).toBe(11); // 10 tool iterations + 1 final call
});

test("handleChat respects time-based timeout", async () => {
  // Mock AI that takes a long time for each call
  let callCount = 0;
  function createMockSlowClient() {
    class MockOpenRouterClient {
      constructor() {
        this.createChatCompletion = mock(async (messages, tools) => {
          callCount++;
          // Simulate slow AI response
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          return {
            success: true,
            message: `Slow call ${callCount}`,
            toolCalls: [
              {
                id: `call_${callCount}`,
                function: {
                  name: "get_schema_info",
                  arguments: "{}",
                },
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          };
        });
      }
    }
    Object.defineProperty(MockOpenRouterClient, "name", {
      value: "OpenRouterClient",
    });
    return MockOpenRouterClient;
  }

  // Mock Date.now to simulate time progression
  const originalDateNow = Date.now;
  let mockTime = 1000000;
  Date.now = mock(() => {
    // Advance time by 2 minutes on each call to exceed 5 minute limit quickly
    mockTime += 2 * 60 * 1000;
    return mockTime;
  });

  const request = createMockRequest({
    message: "Tell me about my data",
    databasePath: "./uploads/test.db",
  });

  try {
    const mockClient = createMockSlowClient();
    const response = await handleChat(request, mockClient);
    const data = await getResponseData(response);

    expect(response.status).toBe(408);
    expect(data.error).toBe("Request timed out - workflow took too long to complete");
  } finally {
    // Restore original Date.now
    Date.now = originalDateNow;
  }
});
