import { AI_CONFIG } from "../lib/ai-config.js";
import { SYSTEM_PROMPT } from "../lib/ai-system-prompt.js";
import { OpenRouterClient } from "../lib/openrouter-client.js";

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
  // Use explicit default parameter handling for Bun compatibility
  // Check if it's actually a constructor function, not just any truthy value
  const ClientClass =
    typeof openRouterClientClass === "function" &&
    openRouterClientClass.name === "OpenRouterClient"
      ? openRouterClientClass
      : OpenRouterClient;

  try {
    const body = await request.json();
    const { message, chatHistory = [] } = body;

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
      return createErrorResponse(`Chat history too long. Maximum messages: ${AI_CONFIG.MAX_CHAT_HISTORY_MESSAGES}`, 400);
    }

    for (const msg of chatHistory) {
      if (!msg || typeof msg !== "object" || !msg.role || !msg.content) {
        return createErrorResponse(
          "Invalid chat history format. Each message must have role and content",
          400
        );
      }

      if (!["user", "assistant"].includes(msg.role)) {
        return createErrorResponse(
          'Invalid message role. Must be "user" or "assistant"',
          400
        );
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message },
    ];

    const client = new ClientClass();

    const result = await client.createChatCompletion(messages);

    if (!result.success) {
      console.error("OpenRouter API error:", result.error);
      return createErrorResponse("AI service temporarily unavailable", 503);
    }

    return createSuccessResponse({
      success: true,
      message: result.message,
      usage: result.usage,
    });
  } catch (error) {
    if (error.name === 'SyntaxError') {
      // JSON parsing error - client's fault
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    
    if (error.message.includes('OPENROUTER_API_KEY')) {
      // Service unavailable due to config - our fault, but not unexpected
      return createErrorResponse("AI service temporarily unavailable", 503);
    }
    
    // True unexpected errors - let the framework handle them
    console.error("Unexpected error in chat handler:", error);
    throw error;
  }
}
