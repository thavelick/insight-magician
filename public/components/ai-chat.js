import { AI_CONFIG } from "../../lib/ai-config.js";
import { ChatAPI } from "../../lib/chat-api.js";
import { ChatHistory } from "../../lib/chat-history.js";
import {
  MESSAGE_ROLES,
  formatContent,
  formatTimestamp,
  getMessageClasses,
  isEmpty,
} from "../../lib/chat-message-utils.js";

export class AIChatComponent {
  constructor(chatAPI = new ChatAPI()) {
    this.chatHistory = new ChatHistory(
      "ai-chat-history",
      AI_CONFIG.STORAGE_MESSAGE_LIMIT,
    );
    this.chatAPI = chatAPI;
    this.createSidebar();
    this.loadChatHistory();
  }

  createSidebar() {
    this.sidebar = document.createElement("div");
    this.sidebar.className = "ai-chat-sidebar";
    this.sidebar.innerHTML = `
      <div class="ai-chat-header">
        <h3>AI Chat</h3>
        <div class="ai-chat-header-buttons">
          <button class="clear-ai-chat" title="Clear chat history">🗑️</button>
          <button class="close-ai-chat" title="Close chat">×</button>
        </div>
      </div>
      <div class="ai-chat-content">
        <div class="ai-chat-messages">
        </div>
        <div class="ai-chat-input-container">
          <textarea 
            class="ai-chat-input" 
            placeholder="Ask me about your data..."
            rows="2"
          ></textarea>
          <button class="ai-chat-send">Send</button>
        </div>
      </div>
    `;

    this.sidebar
      .querySelector(".close-ai-chat")
      .addEventListener("click", () => {
        this.hide();
      });

    this.sidebar
      .querySelector(".clear-ai-chat")
      .addEventListener("click", () => {
        this.clearChat();
      });

    this.sidebar
      .querySelector(".ai-chat-send")
      .addEventListener("click", () => {
        this.sendMessage();
      });

    this.sidebar
      .querySelector(".ai-chat-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

    document.body.appendChild(this.sidebar);
  }

  async sendMessage() {
    const input = this.sidebar.querySelector(".ai-chat-input");
    const message = input.value.trim();

    if (isEmpty(message)) return;

    this.setInputEnabled(false);
    this.addMessage(MESSAGE_ROLES.USER, message);
    input.value = "";

    this.showTypingIndicator();

    try {
      const databasePath = window.app
        ? window.app.getCurrentDatabasePath()
        : null;

      const result = await this.chatAPI.sendMessage(
        message,
        this.chatHistory.getMessages(),
        databasePath,
      );

      if (result.toolResults) {
        this.processToolResults(result.toolResults);
      }

      // Show subtle indicator for multi-tool workflows
      if (
        result.iterations > 1 ||
        (result.toolResults && result.toolResults.length > 1)
      ) {
        const toolCount = result.toolResults ? result.toolResults.length : 0;
        if (result.iterations > 1) {
          console.log(
            `🔗 Multi-step analysis: ${toolCount} tools used across ${result.iterations} iterations`,
          );
        }
      }

      this.addMessage(MESSAGE_ROLES.ASSISTANT, result.message);
    } catch (error) {
      console.error("Chat API error:", error);

      let errorMessage =
        "Sorry, I'm having trouble connecting right now. Please try again.";

      if (error.message?.includes("Network connection failed")) {
        errorMessage =
          "⚠️ Network connection failed. Please check your internet connection and try again.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage =
          "⏳ Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("temporarily unavailable")) {
        errorMessage =
          "🔧 AI service is temporarily unavailable. Please try again in a few minutes.";
      } else if (error.message?.includes("Authentication failed")) {
        errorMessage =
          "🔧 AI service configuration issue. Please try again later.";
      } else if (error.message?.includes("quota exceeded")) {
        errorMessage = "📊 AI service quota exceeded. Please try again later.";
      }

      this.addMessage(MESSAGE_ROLES.ASSISTANT, errorMessage);
    } finally {
      this.hideTypingIndicator();
      this.setInputEnabled(true);
      this.sidebar.querySelector(".ai-chat-input").focus();
    }
  }

  addMessage(role, content) {
    const message = this.chatHistory.addMessage(role, content);
    this.renderAllMessages();
    this.saveChatHistory();
  }

  renderMessage(message) {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "ai-chat-message-wrapper";

    const messageDiv = document.createElement("div");
    messageDiv.className = getMessageClasses(message.role);
    messageDiv.textContent = formatContent(message.content);

    const timestampDiv = document.createElement("div");
    timestampDiv.className = "ai-chat-timestamp";
    timestampDiv.textContent = formatTimestamp(message.timestamp);

    messageWrapper.appendChild(messageDiv);
    messageWrapper.appendChild(timestampDiv);
    messagesContainer.appendChild(messageWrapper);
  }

  scrollToBottom() {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  saveChatHistory() {
    this.chatHistory.save(sessionStorage);
  }

  loadChatHistory() {
    const loaded = this.chatHistory.load(sessionStorage);
    if (loaded) {
      this.renderAllMessages();
    }
  }

  renderAllMessages() {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    messagesContainer.innerHTML = "";
    for (const message of this.chatHistory.getMessages()) {
      this.renderMessage(message);
    }
    this.scrollToBottom();
  }

  setInputEnabled(enabled) {
    const input = this.sidebar.querySelector(".ai-chat-input");
    const sendButton = this.sidebar.querySelector(".ai-chat-send");

    input.disabled = !enabled;
    sendButton.disabled = !enabled;

    if (enabled) {
      input.classList.remove("disabled");
      sendButton.classList.remove("disabled");
    } else {
      input.classList.add("disabled");
      sendButton.classList.add("disabled");
    }
  }

  showTypingIndicator() {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    const indicator = document.createElement("div");
    indicator.className = "message assistant typing-indicator";
    indicator.textContent = "AI is typing...";
    indicator.id = "typing-indicator";
    messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = this.sidebar.querySelector("#typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  get messages() {
    return this.chatHistory.getMessages();
  }

  /**
   * Process tool execution results from the AI
   * Handles different tool actions like schema fetching, widget creation/editing/resizing,
   * and provides visual feedback for multi-step tool workflows
   * @param {Array} toolResults - Array of tool execution results
   */
  processToolResults(toolResults) {
    for (const toolResult of toolResults) {
      const { result } = toolResult;

      if (!result.success) {
        console.warn("Tool execution failed:", result.error);
        continue;
      }

      switch (result.action) {
        case "schema_fetched":
          console.log("Schema information retrieved:", result.data);
          break;

        case "widgets_listed":
          console.log("Widget information retrieved:", result.data);
          break;

        case "sql_query_executed":
          console.log("SQL query executed successfully:", result.data);
          break;

        default:
          console.log("Unknown tool action:", result.action, result);
      }
    }
  }

  show() {
    this.sidebar.classList.add("visible");
    document.body.classList.add("ai-chat-open");

    setTimeout(() => {
      this.sidebar.querySelector(".ai-chat-input").focus();
    }, 300);
  }

  hide() {
    this.sidebar.classList.remove("visible");
    document.body.classList.remove("ai-chat-open");
  }

  clearChat() {
    const confirmed = confirm(
      "Are you sure you want to clear all chat history? This action cannot be undone.",
    );

    if (confirmed) {
      this.chatHistory.clear();
      const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
      messagesContainer.innerHTML = "";
      this.saveChatHistory();
      this.sidebar.querySelector(".ai-chat-input").focus();
    }
  }
}
