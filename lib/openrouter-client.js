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

  async createChatCompletion(messages) {
    try {
      const completion = await this.client.chat.completions.create({
        model: AI_CONFIG.MODEL_NAME,
        messages: messages,
        max_tokens: 2000,
      });

      return {
        success: true,
        message:
          completion.choices[0]?.message?.content || "No response generated",
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
