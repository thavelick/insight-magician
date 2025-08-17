import { expect, mock, test } from "bun:test";
import {
  OpenRouterClient,
  createOpenRouterClient,
} from "../../lib/openrouter-client.js";

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
  // Test with HTTP status code 429 (rate limiting)
  apiError.status = 429;

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
  expect(result.error).toBe(
    "Too many requests. Please wait a moment and try again.",
  );
  // Our client converts API error codes to standardized uppercase format
  expect(result.code).toBe("RATE_LIMITED");
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

test("should handle rate limiting errors specifically", async () => {
  const rateLimitError = new Error("Rate limit exceeded");
  // Test with HTTP status code 429 for rate limiting
  rateLimitError.status = 429;

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(rateLimitError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "Too many requests. Please wait a moment and try again.",
  );
  // We standardize API error codes to uppercase format for consistency
  expect(result.code).toBe("RATE_LIMITED");
  expect(result.originalError).toBe("Rate limit exceeded");
});

test("should handle authentication errors specifically", async () => {
  const authError = new Error("Invalid API key");
  // Test with HTTP status code 401 for authentication errors
  authError.status = 401;

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(authError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "AI service authentication failed. Please check configuration.",
  );
  expect(result.code).toBe("AUTH_ERROR");
});

test("should handle quota exceeded errors specifically", async () => {
  const quotaError = new Error("You exceeded your current quota, please check your plan and billing details");
  // Test quota detection based on message content (no fictional error code needed)

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(quotaError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "AI service quota exceeded. Please try again later.",
  );
  expect(result.code).toBe("QUOTA_EXCEEDED");
});

test("should handle network errors specifically", async () => {
  const networkError = new TypeError("fetch failed");

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(networkError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "Network connection failed. Please check your internet connection.",
  );
  expect(result.code).toBe("NETWORK_ERROR");
});

test("should handle server errors specifically", async () => {
  const serverError = new Error("Internal server error");
  serverError.status = 500;

  const mockOpenAI = function (config) {
    this.chat = {
      completions: {
        create: mock(() => Promise.reject(serverError)),
      },
    };
    return this;
  };

  const client = new OpenRouterClient("test-api-key", mockOpenAI);
  const messages = [{ role: "user", content: "Hello" }];
  const result = await client.createChatCompletion(messages);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "AI service is temporarily unavailable. Please try again later.",
  );
  expect(result.code).toBe("SERVER_ERROR");
});
