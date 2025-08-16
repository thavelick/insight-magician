import { expect, mock, test } from "bun:test";
import {
  OpenRouterClient,
  createOpenRouterClient,
} from "../../lib/openrouter-client.js";

// Create a mock OpenAI module
function createMockOpenAI() {
  return function MockOpenAI(config) {
    this.chat = {
      completions: {
        create: mock(() =>
          Promise.resolve({
            choices: [{ message: { content: "Test response from AI" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        ),
      },
    };
    return this;
  };
}

test("OpenRouterClient constructor throws error without API key", () => {
  const mockOpenAI = createMockOpenAI();
  expect(() => {
    new OpenRouterClient("", mockOpenAI);
  }).toThrow("OPENROUTER_API_KEY environment variable is required");
});

test("OpenRouterClient constructor succeeds with API key", () => {
  const mockOpenAI = createMockOpenAI();
  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  expect(client).toBeInstanceOf(OpenRouterClient);
  expect(client.client).toBeDefined();
});

test("createOpenRouterClient factory function works", () => {
  const mockOpenAI = createMockOpenAI();
  const client = createOpenRouterClient("test-api-key", mockOpenAI);
  expect(client).toBeInstanceOf(OpenRouterClient);
});

test("createChatCompletion handles successful response", async () => {
  const mockOpenAI = createMockOpenAI();
  const client = new OpenRouterClient("test-api-key", mockOpenAI);

  const messages = [
    { role: "system", content: "You are a helpful assistant" },
    { role: "user", content: "Hello" },
  ];

  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(true);
  expect(result.message).toBe("Test response from AI");
  expect(result.usage).toBeDefined();
  expect(client.client.chat.completions.create).toHaveBeenCalledWith({
    model: "anthropic/claude-3.5-haiku",
    messages: messages,
    temperature: 0.7,
    max_tokens: 2000,
  });
});

test("createChatCompletion handles empty response", async () => {
  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() =>
          Promise.resolve({
            choices: [],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 0,
              total_tokens: 10,
            },
          }),
        ),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);

  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(true);
  expect(result.message).toBe("No response generated");
});

test("createChatCompletion handles API errors", async () => {
  const apiError = new Error("API rate limit exceeded");
  apiError.code = "RATE_LIMIT_EXCEEDED";

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(apiError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);

  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe("API rate limit exceeded");
  expect(result.code).toBe("RATE_LIMIT_EXCEEDED");
});

test("createChatCompletion handles errors without code", async () => {
  const apiError = new Error("Network connection failed");

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(apiError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);

  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe("Network connection failed");
  expect(result.code).toBe("UNKNOWN_ERROR");
});
