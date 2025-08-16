export class AIChatComponent {
  constructor() {
    this.messages = [];
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

    // Enter to send, Shift+Enter for new line
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

    if (!message) return;

    this.addMessage("user", message);
    input.value = "";

    // Echo the message back (Phase 1 functionality)
    setTimeout(() => {
      this.addMessage("assistant", `Echo: ${message}`);
    }, 500);
  }

  addMessage(role, content) {
    const message = { role, content, timestamp: Date.now() };
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    this.saveChatHistory();
  }

  renderMessage(message) {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `ai-chat-message ai-chat-message-${message.role}`;

    // Prevent XSS
    messageDiv.textContent = message.content;

    messagesContainer.appendChild(messageDiv);
  }

  scrollToBottom() {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  saveChatHistory() {
    sessionStorage.setItem("ai-chat-history", JSON.stringify(this.messages));
  }

  loadChatHistory() {
    const saved = sessionStorage.getItem("ai-chat-history");
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
        this.renderAllMessages();
      } catch (error) {
        console.error("Failed to load chat history:", error);
        this.messages = [];
      }
    }
  }

  renderAllMessages() {
    const messagesContainer = this.sidebar.querySelector(".ai-chat-messages");
    messagesContainer.innerHTML = "";
    for (const message of this.messages) {
      this.renderMessage(message);
    }
    this.scrollToBottom();
  }

  show() {
    this.sidebar.classList.add("visible");
    document.body.classList.add("ai-chat-open");

    // Focus after transition (300ms)
    setTimeout(() => {
      this.sidebar.querySelector(".ai-chat-input").focus();
    }, 300);
  }

  hide() {
    this.sidebar.classList.remove("visible");
    document.body.classList.remove("ai-chat-open");
  }
}
