import OpenAI from "openai";
import { AI_CONFIG } from "./ai-config.js";

export class OpenRouterClient {
  constructor(apiKey = process.env.OPENROUTER_API_KEY, openaiModule = OpenAI) {
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    this.client = new openaiModule({
      baseURL: AI_CONFIG.OPENROUTER_BASE_URL,
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": AI_CONFIG.SITE_URL,
        "X-Title": AI_CONFIG.SITE_NAME,
      },
    });
  }

  async createChatCompletion(messages, tools = null) {
    try {
      const requestParams = {
        model: AI_CONFIG.MODEL_NAME,
        messages: messages,
        max_tokens: 2000,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestParams.tools = tools;
        requestParams.tool_choice = "auto";
      }

      console.log("🌐 AI API Request:", {
        model: requestParams.model,
        messagesCount: messages.length,
        lastMessage: messages[messages.length - 1],
        toolsCount: tools?.length || 0,
        toolNames: tools?.map((t) => t.function.name) || [],
        maxTokens: requestParams.max_tokens,
      });

      const completion =
        await this.client.chat.completions.create(requestParams);

      console.log("📨 AI API Response:", {
        model: completion.model,
        usage: completion.usage,
        finishReason: completion.choices[0]?.finish_reason,
        hasToolCalls: !!completion.choices[0]?.message?.tool_calls,
        toolCallsCount: completion.choices[0]?.message?.tool_calls?.length || 0,
        messageLength: completion.choices[0]?.message?.content?.length || 0,
        messagePreview:
          completion.choices[0]?.message?.content?.substring(0, 150) +
          (completion.choices[0]?.message?.content?.length > 150 ? "..." : ""),
        toolCalls:
          completion.choices[0]?.message?.tool_calls?.map((tc) => ({
            id: tc.id,
            function: tc.function.name,
            arguments: tc.function.arguments,
          })) || [],
      });

      const choice = completion.choices[0];
      const message = choice?.message;

      // Handle tool calls if present
      if (message?.tool_calls && message.tool_calls.length > 0) {
        return {
          success: true,
          message: message.content || "",
          toolCalls: message.tool_calls,
          usage: completion.usage,
        };
      }

      // Regular message response
      return {
        success: true,
        message: message?.content || "No response generated",
        usage: completion.usage,
      };
    } catch (error) {
      // Map API errors to user-friendly messages based on HTTP status codes and message patterns
      let errorType = "UNKNOWN_ERROR";
      let userMessage = error.message;
      if (error.message?.includes("quota")) {
        errorType = "QUOTA_EXCEEDED";
        userMessage = "AI service quota exceeded. Please try again later.";
      } else if (error.status === 429) {
        errorType = "RATE_LIMITED";
        userMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.status === 401) {
        errorType = "AUTH_ERROR";
        userMessage =
          "AI service authentication failed. Please check configuration.";
      } else if (
        error.name === "TypeError" ||
        error.message?.includes("fetch")
      ) {
        errorType = "NETWORK_ERROR";
        userMessage =
          "Network connection failed. Please check your internet connection.";
      } else if (error.status >= 500) {
        errorType = "SERVER_ERROR";
        userMessage =
          "AI service is temporarily unavailable. Please try again later.";
      } else if (error.status >= 400 && error.status < 500) {
        errorType = "CLIENT_ERROR";
        userMessage = "Invalid request to AI service.";
      }

      return {
        success: false,
        error: userMessage,
        code: errorType,
        originalError: error.message,
      };
    }
  }
}

export function createOpenRouterClient(apiKey, openaiModule) {
  return new OpenRouterClient(apiKey, openaiModule);
}
