/**
 * ChatHistory utility class for managing chat message history
 * Handles message creation, storage, serialization, and validation
 */
export class ChatHistory {
  constructor(storageKey = "ai-chat-history", maxMessages = 200) {
    this.storageKey = storageKey;
    this.maxMessages = maxMessages;
    this.messages = [];
  }

  /**
   * Create a new message with timestamp and validation
   * @param {string} role - Message role (user/assistant)
   * @param {string} content - Message content
   * @returns {object} Created message object
   * @throws {Error} If role or content is invalid
   */
  createMessage(role, content) {
    if (!this.isValidRole(role)) {
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'`);
    }

    if (!this.isValidContent(content)) {
      throw new Error("Content must be a non-empty string");
    }

    return {
      role,
      content: this.normalizeContent(content),
      timestamp: Date.now(),
    };
  }

  /**
   * Add a message to the history
   * @param {string} role - Message role
   * @param {string} content - Message content
   * @returns {object} The created message
   */
  addMessage(role, content) {
    const message = this.createMessage(role, content);
    this.messages.push(message);
    this.enforceMessageLimit();
    return message;
  }

  /**
   * Get all messages
   * @returns {Array} Array of message objects
   */
  getMessages() {
    return [...this.messages]; // Return copy to prevent external mutation
  }

  /**
   * Get recent messages for API calls
   * @param {number} limit - Maximum number of messages to return
   * @returns {Array} Array of recent messages
   */
  getRecentMessages(limit = this.maxMessages) {
    return this.messages.slice(-limit);
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages = [];
  }

  /**
   * Get total message count
   * @returns {number} Number of messages
   */
  getMessageCount() {
    return this.messages.length;
  }

  /**
   * Save chat history to storage
   * @param {Storage} storage - Storage object (sessionStorage/localStorage)
   */
  save(storage = sessionStorage) {
    try {
      const serialized = this.serialize();
      storage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error("Failed to save chat history:", error);
      throw new Error("Failed to save chat history");
    }
  }

  /**
   * Load chat history from storage
   * @param {Storage} storage - Storage object (sessionStorage/localStorage)
   * @returns {boolean} True if loaded successfully, false otherwise
   */
  load(storage = sessionStorage) {
    try {
      const saved = storage.getItem(this.storageKey);
      if (!saved) {
        return false;
      }

      this.deserialize(saved);
      return true;
    } catch (error) {
      console.error("Failed to load chat history:", error);
      this.messages = [];
      return false;
    }
  }

  /**
   * Serialize messages to JSON string
   * @returns {string} JSON string of messages
   */
  serialize() {
    return JSON.stringify(this.messages);
  }

  /**
   * Deserialize messages from JSON string
   * @param {string} data - JSON string to deserialize
   * @throws {Error} If deserialization fails or data is invalid
   */
  deserialize(data) {
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid chat history format: expected array");
    }

    for (const message of parsed) {
      if (!this.isValidMessage(message)) {
        throw new Error("Invalid message format in chat history");
      }
    }

    this.messages = parsed;
    this.enforceMessageLimit();
  }

  /**
   * Validate message role
   * @param {string} role - Role to validate
   * @returns {boolean} True if valid
   */
  isValidRole(role) {
    return (
      typeof role === "string" && (role === "user" || role === "assistant")
    );
  }

  /**
   * Validate message content
   * @param {string} content - Content to validate
   * @returns {boolean} True if valid
   */
  isValidContent(content) {
    return typeof content === "string" && content.trim().length > 0;
  }

  /**
   * Validate complete message object
   * @param {object} message - Message to validate
   * @returns {boolean} True if valid
   */
  isValidMessage(message) {
    if (!message || typeof message !== "object") {
      return false;
    }

    return (
      this.isValidRole(message.role) &&
      this.isValidContent(message.content) &&
      typeof message.timestamp === "number" &&
      message.timestamp > 0
    );
  }

  /**
   * Normalize message content by trimming whitespace
   * @param {string} content - Content to normalize
   * @returns {string} Normalized content
   */
  normalizeContent(content) {
    // Basic normalization - for chat, we preserve the raw text
    // XSS prevention happens at rendering time with textContent
    return content.trim();
  }

  /**
   * Enforce maximum message limit
   * Removes oldest messages if limit exceeded
   */
  enforceMessageLimit() {
    if (this.messages.length > this.maxMessages) {
      const excess = this.messages.length - this.maxMessages;
      this.messages.splice(0, excess);
    }
  }

  /**
   * Get messages formatted for API requests
   * Excludes timestamps and includes only role/content
   * @param {number} limit - Maximum number of messages
   * @returns {Array} Array of API-formatted messages
   */
  getApiMessages(limit = this.maxMessages) {
    return this.getRecentMessages(limit).map(({ role, content }) => ({
      role,
      content,
    }));
  }
}
