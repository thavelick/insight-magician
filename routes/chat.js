import { OpenRouterClient } from "../lib/openrouter-client.js";
import { SYSTEM_PROMPT } from "../lib/ai-system-prompt.js";
import { AI_CONFIG } from "../lib/ai-config.js";

export async function handleChat(request, openRouterClientClass = OpenRouterClient) {
  console.log('handleChat called with:', {
    requestType: typeof request,
    clientClassType: typeof openRouterClientClass,
    clientClassName: openRouterClientClass?.name,
    isUndefined: openRouterClientClass === undefined
  });
  try {
    const body = await request.json();
    const { message, chatHistory = [] } = body;

    // Validate required parameters
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing required parameter: message",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Security: Validate message length
    if (message.length > AI_CONFIG.MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `Message too long. Maximum length: ${AI_CONFIG.MAX_MESSAGE_LENGTH} characters`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Security: Validate chat history structure and limit
    if (!Array.isArray(chatHistory)) {
      return new Response(
        JSON.stringify({
          error: "chatHistory must be an array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (chatHistory.length > AI_CONFIG.MAX_CHAT_HISTORY_MESSAGES) {
      return new Response(
        JSON.stringify({
          error: `Chat history too long. Maximum messages: ${AI_CONFIG.MAX_CHAT_HISTORY_MESSAGES}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate chat history message structure
    for (const msg of chatHistory) {
      if (!msg || typeof msg !== "object" || !msg.role || !msg.content) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid chat history format. Each message must have role and content",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (!["user", "assistant"].includes(msg.role)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid message role. Must be "user" or "assistant"',
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // Build messages array with system prompt
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message },
    ];

    // Initialize OpenRouter client
    const client = new openRouterClientClass();

    // Call OpenRouter API
    const result = await client.createChatCompletion(messages);

    if (!result.success) {
      console.error("OpenRouter API error:", result.error);
      return new Response(
        JSON.stringify({
          error: "AI service temporarily unavailable",
          type: "ai_error",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        usage: result.usage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Chat request error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        type: "server_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
