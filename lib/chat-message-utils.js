/**
 * Chat message utility functions for validation, sanitization, and formatting
 * Handles message operations and display logic
 */

/**
 * Valid message roles
 */
export const MESSAGE_ROLES = {
  USER: "user",
  ASSISTANT: "assistant",
};

/**
 * Validate message role
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid
 */
export function isValidRole(role) {
  return Object.values(MESSAGE_ROLES).includes(role);
}

/**
 * Validate message content
 * @param {string} content - Content to validate
 * @returns {boolean} True if content is valid
 */
export function isValidContent(content) {
  return typeof content === "string" && content.trim().length > 0;
}

/**
 * Normalize content by trimming whitespace
 * Note: XSS prevention happens at render time with textContent
 * @param {string} content - Content to normalize
 * @returns {string} Normalized content
 */
export function normalizeContent(content) {
  if (typeof content !== "string") {
    return "";
  }
  return content.trim();
}

/**
 * Get CSS class name for message role
 * @param {string} role - Message role
 * @returns {string} CSS class name
 */
export function getRoleClass(role) {
  return `ai-chat-message-${role}`;
}

/**
 * Get complete CSS class names for a message
 * @param {string} role - Message role
 * @returns {string} Complete CSS class string
 */
export function getMessageClasses(role) {
  return `ai-chat-message ${getRoleClass(role)}`;
}

/**
 * Format content for display (handles line breaks, etc.)
 * @param {string} content - Content to format
 * @returns {string} Formatted content
 */
export function formatContent(content) {
  const normalized = normalizeContent(content);
  return normalized;
}

/**
 * Create an echo response message
 * @param {string} originalMessage - Original user message
 * @returns {string} Echo response content
 */
export function createEchoResponse(originalMessage) {
  return `Echo: ${originalMessage}`;
}

/**
 * Validate a complete message object
 * @param {object} message - Message object to validate
 * @returns {boolean} True if message is valid
 */
export function isValidMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }

  return (
    isValidRole(message.role) &&
    isValidContent(message.content) &&
    typeof message.timestamp === "number" &&
    message.timestamp > 0
  );
}

/**
 * Get display name for role
 * @param {string} role - Message role
 * @returns {string} Display name
 */
export function getRoleDisplayName(role) {
  switch (role) {
    case MESSAGE_ROLES.USER:
      return "You";
    case MESSAGE_ROLES.ASSISTANT:
      return "AI";
    default:
      return "Unknown";
  }
}

/**
 * Check if content appears to be empty or whitespace only
 * @param {string} content - Content to check
 * @returns {boolean} True if effectively empty
 */
export function isEmpty(content) {
  return !content || content.trim().length === 0;
}

/**
 * Truncate content to a maximum length
 * @param {string} content - Content to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated content
 */
export function truncate(content, maxLength = 1000) {
  if (!content || content.length <= maxLength) {
    return content;
  }
  return `${content.substring(0, maxLength - 3)}...`;
}

/**
 * Extract preview text from content (first line or truncated)
 * @param {string} content - Content to preview
 * @param {number} maxLength - Maximum preview length
 * @returns {string} Preview text
 */
export function getPreview(content, maxLength = 50) {
  if (!content) return "";

  const firstLine = content.split("\n")[0];
  return truncate(firstLine, maxLength);
}

/**
 * Count words in content
 * @param {string} content - Content to count
 * @returns {number} Word count
 */
export function countWords(content) {
  if (!content) return 0;
  return content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}
