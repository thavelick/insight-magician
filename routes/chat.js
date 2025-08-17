import { AI_CONFIG } from "../lib/ai-config.js";
import { SYSTEM_PROMPT } from "../lib/ai-system-prompt.js";
import { OpenRouterClient } from "../lib/openrouter-client.js";
import { toolExecutor } from "../lib/tool-executor.js";
import { toolRegistry } from "../lib/tool-registry.js";

// Register all tools from the registry with the executor
for (const tool of toolRegistry.getAllTools()) {
  toolExecutor.registerTool(tool.name, tool);
}

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
  const ClientClass =
    typeof openRouterClientClass === "function" &&
    openRouterClientClass.name === "OpenRouterClient"
      ? openRouterClientClass
      : OpenRouterClient;

  try {
    const body = await request.json();
    const { message, chatHistory = [], databasePath, widgets = [] } = body;

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

    const tools = toolExecutor.getToolDefinitions();

    console.log("🛠️  Available tools for AI:", {
      count: tools.length,
      tools: tools.map((t) => t.function.name),
      databasePath: databasePath || "none",
    });

    // Multi-tool workflow support: iterative tool calling loop
    const MAX_TOOL_ITERATIONS = 10;
    const MAX_WORKFLOW_TIME_MS = 5 * 60 * 1000; // 5 minutes
    const workflowStartTime = Date.now();
    const context = { databasePath, widgets };
    const allToolResults = [];
    const currentMessages = [...messages];
    let iteration = 0;
    const totalUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    while (iteration < MAX_TOOL_ITERATIONS) {
      // Check for time-based timeout
      const elapsedTime = Date.now() - workflowStartTime;
      if (elapsedTime > MAX_WORKFLOW_TIME_MS) {
        console.warn(
          `⏰ Tool workflow timed out after ${Math.round(elapsedTime / 1000)}s (max: ${MAX_WORKFLOW_TIME_MS / 1000}s)`
        );
        return createErrorResponse(
          "Request timed out - workflow took too long to complete",
          408
        );
      }
      iteration++;
      console.log(
        `🔄 Tool calling iteration ${iteration}/${MAX_TOOL_ITERATIONS}`,
      );

      const result = await client.createChatCompletion(currentMessages, tools);

      if (!result.success) {
        console.error("AI API error:", result.error);
        return createErrorResponse("AI service temporarily unavailable", 503);
      }

      // Accumulate usage statistics
      if (result.usage) {
        totalUsage.prompt_tokens += result.usage.prompt_tokens || 0;
        totalUsage.completion_tokens += result.usage.completion_tokens || 0;
        totalUsage.total_tokens += result.usage.total_tokens || 0;
      }

      // If no tool calls, we're done
      if (!result.toolCalls || result.toolCalls.length === 0) {
        console.log("🎯 AI completed workflow without tool calls:", {
          iteration,
          messageLength: result.message?.length || 0,
          messagePreview:
            result.message?.substring(0, 100) +
            (result.message?.length > 100 ? "..." : ""),
          totalToolResults: allToolResults.length,
        });

        return createSuccessResponse({
          success: true,
          message: result.message,
          usage: totalUsage,
          toolResults: allToolResults,
          iterations: iteration,
        });
      }

      console.log("🤖 AI requested tool calls:", {
        iteration,
        count: result.toolCalls.length,
        tools: result.toolCalls.map(
          (call) => `${call.function.name}(${call.function.arguments})`,
        ),
        aiMessage: result.message || "none",
      });

      // Execute tool calls
      const toolResults = await toolExecutor.executeToolCalls(
        result.toolCalls,
        context,
      );

      // Add to total results
      allToolResults.push(...toolResults);

      // Build conversation context for next iteration
      currentMessages.push({
        role: "assistant",
        content: result.message || "",
        tool_calls: result.toolCalls,
      });

      for (const toolResult of toolResults) {
        const toolContent = JSON.stringify(toolResult.result);
        console.log("📤 Sending tool result to AI:", {
          iteration,
          toolCallId: toolResult.toolCallId,
          contentPreview:
            toolContent.length > 200
              ? `${toolContent.substring(0, 200)}...`
              : toolContent,
          contentLength: toolContent.length,
        });

        currentMessages.push({
          role: "tool",
          tool_call_id: toolResult.toolCallId,
          content: toolContent,
        });
      }
    }

    // If we hit the iteration limit, make one final call to get AI's response
    console.log(
      "⚠️  Reached maximum tool iterations, getting final response...",
    );
    const finalResult = await client.createChatCompletion(currentMessages);

    if (!finalResult.success) {
      console.error("AI API error on final response:", finalResult.error);
      return createErrorResponse("AI service temporarily unavailable", 503);
    }

    // Accumulate final usage
    if (finalResult.usage) {
      totalUsage.prompt_tokens += finalResult.usage.prompt_tokens || 0;
      totalUsage.completion_tokens += finalResult.usage.completion_tokens || 0;
      totalUsage.total_tokens += finalResult.usage.total_tokens || 0;
    }

    console.log("🎯 AI final response after max iterations:", {
      iterations: MAX_TOOL_ITERATIONS,
      messageLength: finalResult.message?.length || 0,
      messagePreview:
        finalResult.message?.substring(0, 100) +
        (finalResult.message?.length > 100 ? "..." : ""),
      totalToolResults: allToolResults.length,
      totalUsage,
    });

    return createSuccessResponse({
      success: true,
      message: finalResult.message,
      usage: totalUsage,
      toolResults: allToolResults,
      iterations: MAX_TOOL_ITERATIONS,
      reachedMaxIterations: true,
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
