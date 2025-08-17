export class ChatAPI {
  formatChatHistoryForAPI(messages) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async sendMessage(message, chatHistory, databasePath = null) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          chatHistory: this.formatChatHistoryForAPI(chatHistory),
          databasePath: databasePath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "Failed to get AI response";

        if (response.status === 429) {
          errorMessage =
            "Too many requests. Please wait a moment and try again.";
        } else if (response.status === 503) {
          errorMessage =
            "AI service is temporarily unavailable. Please try again later.";
        } else if (response.status >= 500) {
          errorMessage = "Server error occurred. Please try again later.";
        } else if (response.status === 401) {
          errorMessage =
            "Authentication failed. Please check your configuration.";
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = data.code;
        throw error;
      }

      return {
        message: data.message,
        usage: data.usage,
        toolResults: data.toolResults,
      };
    } catch (error) {
      if (error.name === "TypeError" || error.message?.includes("fetch")) {
        throw new Error(
          "Network connection failed. Please check your internet connection and try again.",
        );
      }
      if (error.message?.includes("JSON")) {
        throw new Error("Invalid response from server. Please try again.");
      }

      throw error;
    }
  }
}
