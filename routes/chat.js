import { AI_CONFIG } from "../lib/ai-config.js";
import { SYSTEM_PROMPT } from "../lib/ai-system-prompt.js";
import { OpenRouterClient } from "../lib/openrouter-client.js";
import { toolExecutor } from "../lib/tool-executor.js";
import { SchemaTool } from "../lib/tools/schema-tool.js";

// Register tools on module load
const schemaTool = new SchemaTool();
toolExecutor.registerTool("get_schema_info", schemaTool);

function createErrorResponse(error, status) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createSuccessResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleChat(request, openRouterClientClass) {
  // Bun-compatible default parameter handling
  const ClientClass =
    typeof openRouterClientClass === "function" &&
    openRouterClientClass.name === "OpenRouterClient"
      ? openRouterClientClass
      : OpenRouterClient;

  try {
    const body = await request.json();
    const { message, chatHistory = [], databasePath } = body;

    if (!message || typeof message !== "string") {
      return createErrorResponse("Missing required parameter: message", 400);
    }

    // Security: Validate message length
    if (message.length > AI_CONFIG.MAX_MESSAGE_LENGTH) {
      return createErrorResponse("Message too long", 400);
    }

    // Security: Validate chat history structure and limit
    if (!Array.isArray(chatHistory)) {
      return createErrorResponse("chatHistory must be an array", 400);
    }

    if (chatHistory.length > AI_CONFIG.MAX_CHAT_HISTORY_MESSAGES) {
      return createErrorResponse(
        `Chat history too long. Maximum messages: ${AI_CONFIG.MAX_CHAT_HISTORY_MESSAGES}`,
        400,
      );
    }

    for (const msg of chatHistory) {
      if (!msg || typeof msg !== "object" || !msg.role || !msg.content) {
        return createErrorResponse(
          "Invalid chat history format. Each message must have role and content",
          400,
        );
      }

      if (!["user", "assistant"].includes(msg.role)) {
        return createErrorResponse(
          'Invalid message role. Must be "user" or "assistant"',
          400,
        );
      }
    }

    // Implement truncation strategy: keep only recent messages for API calls
    // This ensures we stay within token limits while preserving recent context
    const maxApiMessages = AI_CONFIG.STORAGE_MESSAGE_LIMIT;
    const truncatedHistory =
      chatHistory.length > maxApiMessages
        ? chatHistory.slice(-maxApiMessages)
        : chatHistory;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...truncatedHistory,
      { role: "user", content: message },
    ];

    const client = new ClientClass();

    // Get available tools
    const tools = toolExecutor.getToolDefinitions();

    // First API call - potentially with tool calls
    const result = await client.createChatCompletion(messages, tools);

    if (!result.success) {
      console.error("OpenRouter API error:", result.error);
      return createErrorResponse("AI service temporarily unavailable", 503);
    }

    // Check if AI wants to use tools
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("Processing tool calls:", result.toolCalls);

      // Execute the tool calls
      const context = { databasePath };
      const toolResults = await toolExecutor.executeToolCalls(
        result.toolCalls,
        context,
      );

      // Prepare messages for second API call with tool results
      const toolMessages = [...messages];

      // Add the assistant's message with tool calls
      toolMessages.push({
        role: "assistant",
        content: result.message || "",
        tool_calls: result.toolCalls,
      });

      // Add tool results as tool messages
      for (const toolResult of toolResults) {
        toolMessages.push({
          role: "tool",
          tool_call_id: toolResult.toolCallId,
          content: JSON.stringify(toolResult.result),
        });
      }

      // Second API call to get final response
      const finalResult = await client.createChatCompletion(toolMessages);

      if (!finalResult.success) {
        console.error(
          "OpenRouter API error on tool result processing:",
          finalResult.error,
        );
        return createErrorResponse("AI service temporarily unavailable", 503);
      }

      return createSuccessResponse({
        success: true,
        message: finalResult.message,
        usage: finalResult.usage,
        toolResults: toolResults,
      });
    }

    // No tool calls - return regular response
    return createSuccessResponse({
      success: true,
      message: result.message,
      usage: result.usage,
    });
  } catch (error) {
    if (error.name === "SyntaxError") {
      return createErrorResponse("Invalid JSON in request body", 400);
    }

    if (error.message.includes("OPENROUTER_API_KEY")) {
      return createErrorResponse("AI service temporarily unavailable", 503);
    }
    console.error("Unexpected error in chat handler:", error);
    throw error;
  }
}
