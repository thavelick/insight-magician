import { ChatHistory } from "../../lib/chat-history.js";
import {
  MESSAGE_ROLES,
  createEchoResponse,
  formatContent,
  getMessageClasses,
  isEmpty,
} from "../../lib/chat-message-utils.js";

export class AIChatComponent {
  constructor() {
    this.chatHistory = new ChatHistory("ai-chat-history", 200);
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

  sendMessage() {
    const input = this.sidebar.querySelector(".ai-chat-input");
    const message = input.value.trim();

    if (isEmpty(message)) return;

    this.addMessage(MESSAGE_ROLES.USER, message);
    input.value = "";

    setTimeout(() => {
      const echoResponse = createEchoResponse(message);
      this.addMessage(MESSAGE_ROLES.ASSISTANT, echoResponse);
    }, 500);
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
