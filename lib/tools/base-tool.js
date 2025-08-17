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
