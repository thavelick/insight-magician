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
      return {
        success: false,
        error: error.message,
        code: error.code || "UNKNOWN_ERROR",
      };
    }
  }
}

export function createOpenRouterClient(apiKey, openaiModule) {
  return new OpenRouterClient(apiKey, openaiModule);
}
