/**
 * Base class for all tools
 */
export class BaseTool {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Get the AI API tool definition
   * @returns {Object} Tool definition object
   */
  getDefinition() {
    throw new Error("getDefinition() must be implemented by subclass");
  }

  /**
   * Get human-readable description for system prompt
   * @returns {string} Brief description of what the tool does
   */
  getPromptDescription() {
    throw new Error("getPromptDescription() must be implemented by subclass");
  }

  /**
   * Get usage guidance for system prompt
   * @returns {string} When and how to use this tool
   */
  getUsageGuidance() {
    throw new Error("getUsageGuidance() must be implemented by subclass");
  }

  /**
   * Get example queries that should trigger this tool
   * @returns {string[]} Array of example user queries
   */
  getExampleQueries() {
    throw new Error("getExampleQueries() must be implemented by subclass");
  }

  /**
   * Get technical usage examples and documentation for this tool
   * @returns {string} Technical examples, code samples, etc. (empty string if none)
   */
  getToolUseExamples() {
    return "";
  }

  /**
   * Validate tool parameters
   * @param {Object} parameters - Parameters to validate
   * @returns {Object} Validation result {valid: boolean, error?: string}
   */
  validateParameters(parameters) {
    // Default implementation - no validation
    return { valid: true };
  }

  /**
   * Execute the tool
   * @param {Object} parameters - Tool parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(parameters, context) {
    throw new Error("execute() must be implemented by subclass");
  }
}
