import { ChatHistory } from "../../lib/chat-history.js";
import { ChatAPI } from "../../lib/chat-api.js";
import {
  MESSAGE_ROLES,
  formatContent,
  getMessageClasses,
  isEmpty,
} from "../../lib/chat-message-utils.js";

export class AIChatComponent {
  constructor(chatAPI = new ChatAPI()) {
    this.chatHistory = new ChatHistory("ai-chat-history", 200);
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
        <button class="close-ai-chat">×</button>
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

    // Disable input while processing
    this.setInputEnabled(false);
    this.addMessage(MESSAGE_ROLES.USER, message);
    input.value = "";

    // Add loading indicator
    this.showTypingIndicator();

    try {
      // Call the chat API
      const result = await this.chatAPI.sendMessage(message, this.chatHistory.getMessages());

      // Add AI response
      this.addMessage(MESSAGE_ROLES.ASSISTANT, result.message);
    } catch (error) {
      console.error('Chat API error:', error);
      this.addMessage(MESSAGE_ROLES.ASSISTANT, 
        "Sorry, I'm having trouble connecting right now. Please try again.");
    } finally {
      this.hideTypingIndicator();
      this.setInputEnabled(true);
      this.sidebar.querySelector(".ai-chat-input").focus();
    }
  }

  addMessage(role, content) {
    const message = this.chatHistory.addMessage(role, content);
    this.renderMessage(message);
    this.scrollToBottom();
    this.saveChatHistory();
  }

  renderMessage(message) {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = getMessageClasses(message.role);

    messageDiv.textContent = formatContent(message.content);

    messagesContainer.appendChild(messageDiv);
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
}
