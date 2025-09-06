import { logger } from "./logger.js";
/**
 * Tool Executor - Central registry and execution system for AI tools
 */
import { BaseTool } from "./tools/base-tool.js";

export class ToolExecutor {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool with the executor
   * @param {string} name - Tool name (must match function name in tool definition)
   * @param {BaseTool} toolInstance - Instance of a tool class
   */
  registerTool(name, toolInstance) {
    if (!name || typeof name !== "string") {
      throw new Error("Tool name must be a non-empty string");
    }

    if (!toolInstance || typeof toolInstance.execute !== "function") {
      throw new Error("Tool instance must have an execute method");
    }

    this.tools.set(name, toolInstance);
    logger.debug(`Tool registered: ${name}`);
  }

  /**
   * Get all registered tool definitions for the AI API
   * @returns {Array} Array of tool definitions
   */
  getToolDefinitions() {
    const definitions = [];

    for (const [name, tool] of this.tools) {
      if (typeof tool.getDefinition === "function") {
        definitions.push(tool.getDefinition());
      }
    }

    return definitions;
  }

  /**
   * Execute a tool call
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} parameters - Parameters to pass to the tool
   * @param {Object} context - Additional context (database, user session, etc.)
   * @returns {Promise<Object>} Tool execution result
   */
  async executeTool(toolName, parameters, context = {}) {
    try {
      logger.debug(`🔧 Executing tool: ${toolName}`, {
        parameters,
        context: context ? Object.keys(context) : "none",
      });

      const tool = this.tools.get(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
          action: "tool_error",
        };
      }

      // Validate parameters if the tool has a validation method
      if (typeof tool.validateParameters === "function") {
        const validation = tool.validateParameters(parameters);
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid parameters: ${validation.error}`,
            action: "validation_error",
          };
        }
      }

      // Execute the tool
      const result = await tool.execute(parameters, context);

      logger.debug(`✅ Tool ${toolName} executed successfully`, {
        success: result.success,
        action: result.action,
        dataPreview: result.data
          ? `${Object.keys(result.data).join(", ")} (${JSON.stringify(result.data).length} chars)`
          : "none",
        error: result.error || "none",
      });
      return result;
    } catch (error) {
      logger.error(`Tool execution failed for ${toolName}:`, error);

      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
        action: "execution_error",
        originalError: error.message,
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence
   * @param {Array} toolCalls - Array of tool call objects from the AI API
   * @param {Object} context - Shared context for all tools
   * @returns {Promise<Array>} Array of tool execution results
   */
  async executeToolCalls(toolCalls, context = {}) {
    logger.debug(`🛠️  Processing ${toolCalls.length} tool call(s):`, {
      tools: toolCalls.map((call) => call.function.name).join(", "),
    });

    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const { function: func, id: toolCallId } = toolCall;
        const { name: toolName, arguments: argsString } = func;

        // Parse tool arguments
        let parameters;
        try {
          // Handle empty arguments string from AI (treat as empty object)
          const argsToProcess = argsString.trim() === "" ? "{}" : argsString;
          parameters = JSON.parse(argsToProcess);
        } catch (parseError) {
          logger.error("❌ Failed to parse tool arguments:", {
            toolName,
            arguments: argsString,
            error: parseError.message,
          });
          results.push({
            toolCallId,
            result: {
              success: false,
              error: `Invalid JSON in tool arguments: ${parseError.message}`,
              action: "parse_error",
            },
          });
          continue;
        }

        // Execute the tool
        const result = await this.executeTool(toolName, parameters, context);

        results.push({
          toolCallId,
          result,
        });
      } catch (error) {
        logger.error("Tool call processing failed:", error);
        results.push({
          toolCallId: toolCall.id || "unknown",
          result: {
            success: false,
            error: `Tool call processing failed: ${error.message}`,
            action: "processing_error",
          },
        });
      }
    }

    logger.debug(
      `📋 Tool execution completed. Returning ${results.length} result(s) to AI:`,
      {
        results: results.map((r) => ({
          toolCallId: r.toolCallId,
          success: r.result.success,
          action: r.result.action,
          hasData: !!r.result.data,
          error: r.result.error || "none",
        })),
      },
    );

    return results;
  }

  /**
   * Get list of registered tool names
   * @returns {Array<string>} Array of tool names
   */
  getRegisteredToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   * @param {string} toolName - Name of the tool
   * @returns {boolean} True if tool is registered
   */
  isToolRegistered(toolName) {
    return this.tools.has(toolName);
  }
}

// Export a singleton instance
export const toolExecutor = new ToolExecutor();
