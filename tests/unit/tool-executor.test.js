import { expect, mock, test } from "bun:test";
import { ToolExecutor } from "../../lib/tool-executor.js";
import { BaseTool } from "../../lib/tools/base-tool.js";

// Mock tool for testing
class MockTool extends BaseTool {
  constructor(shouldFail = false) {
    super("mock_tool", "A mock tool for testing");
    this.shouldFail = shouldFail;
  }

  getDefinition() {
    return {
      type: "function",
      function: {
        name: "mock_tool",
        description: "A mock tool for testing",
        parameters: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "Test input parameter",
            },
          },
          required: ["input"],
        },
      },
    };
  }

  async execute(args, context = {}) {
    if (this.shouldFail) {
      throw new Error("Mock tool execution failed");
    }

    return {
      success: true,
      action: "mock_action",
      data: { input: args.input, processed: true },
    };
  }
}

test("ToolExecutor constructor initializes empty registry", () => {
  const executor = new ToolExecutor();
  expect(executor.tools).toEqual(new Map());
});

test("registerTool adds tool to registry", () => {
  const executor = new ToolExecutor();
  const mockTool = new MockTool();

  executor.registerTool("test_tool", mockTool);

  expect(executor.tools.has("test_tool")).toBe(true);
  expect(executor.tools.get("test_tool")).toBe(mockTool);
});

test("registerTool throws error for invalid tool", () => {
  const executor = new ToolExecutor();

  expect(() => {
    executor.registerTool("invalid_tool", {});
  }).toThrow("Tool instance must have an execute method");
});

test("getToolDefinitions returns OpenAI-compatible tool definitions", () => {
  const executor = new ToolExecutor();
  const mockTool = new MockTool();

  executor.registerTool("test_tool", mockTool);

  const definitions = executor.getToolDefinitions();

  expect(definitions).toEqual([
    {
      type: "function",
      function: {
        name: "mock_tool",
        description: "A mock tool for testing",
        parameters: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "Test input parameter",
            },
          },
          required: ["input"],
        },
      },
    },
  ]);
});

test("getToolDefinitions returns empty array for empty registry", () => {
  const executor = new ToolExecutor();
  const definitions = executor.getToolDefinitions();
  expect(definitions).toEqual([]);
});

test("executeToolCalls executes single tool call successfully", async () => {
  const executor = new ToolExecutor();
  const mockTool = new MockTool();

  executor.registerTool("mock_tool", mockTool);

  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "mock_tool",
        arguments: '{"input": "test value"}',
      },
    },
  ];

  const context = { testContext: true };
  const results = await executor.executeToolCalls(toolCalls, context);

  expect(results).toHaveLength(1);
  expect(results[0]).toEqual({
    toolCallId: "call_123",
    result: {
      success: true,
      action: "mock_action",
      data: { input: "test value", processed: true },
    },
  });
});

test("executeToolCalls executes multiple tool calls", async () => {
  const executor = new ToolExecutor();
  const mockTool = new MockTool();

  executor.registerTool("mock_tool", mockTool);

  const toolCalls = [
    {
      id: "call_1",
      type: "function",
      function: {
        name: "mock_tool",
        arguments: '{"input": "first"}',
      },
    },
    {
      id: "call_2",
      type: "function",
      function: {
        name: "mock_tool",
        arguments: '{"input": "second"}',
      },
    },
  ];

  const results = await executor.executeToolCalls(toolCalls);

  expect(results).toHaveLength(2);
  expect(results[0].toolCallId).toBe("call_1");
  expect(results[1].toolCallId).toBe("call_2");
  expect(results[0].result.data.input).toBe("first");
  expect(results[1].result.data.input).toBe("second");
});

test("executeToolCalls handles unknown tool gracefully", async () => {
  const executor = new ToolExecutor();

  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "unknown_tool",
        arguments: '{"input": "test"}',
      },
    },
  ];

  const results = await executor.executeToolCalls(toolCalls);

  expect(results).toHaveLength(1);
  expect(results[0]).toEqual({
    toolCallId: "call_123",
    result: {
      success: false,
      error: "Tool 'unknown_tool' not found",
      action: "tool_error",
    },
  });
});

test("executeToolCalls handles invalid JSON arguments", async () => {
  const executor = new ToolExecutor();
  const mockTool = new MockTool();

  executor.registerTool("mock_tool", mockTool);

  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "mock_tool",
        arguments: "invalid json{",
      },
    },
  ];

  const results = await executor.executeToolCalls(toolCalls);

  expect(results).toHaveLength(1);
  expect(results[0].result.success).toBe(false);
  expect(results[0].result.error).toContain("Invalid JSON in tool arguments");
});

test("executeToolCalls handles tool execution errors", async () => {
  const executor = new ToolExecutor();
  const failingTool = new MockTool(true); // Configure to fail

  executor.registerTool("failing_tool", failingTool);

  const toolCalls = [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "failing_tool",
        arguments: '{"input": "test"}',
      },
    },
  ];

  const results = await executor.executeToolCalls(toolCalls);

  expect(results).toHaveLength(1);
  expect(results[0].result.success).toBe(false);
  expect(results[0].result.error).toBe(
    "Tool execution failed: Mock tool execution failed",
  );
});

test("BaseTool abstract methods throw errors when not implemented", async () => {
  const baseTool = new BaseTool();

  expect(() => baseTool.getDefinition()).toThrow(
    "getDefinition() must be implemented by subclass",
  );
  await expect(baseTool.execute()).rejects.toThrow(
    "execute() must be implemented by subclass",
  );
});
