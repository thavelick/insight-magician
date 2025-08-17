import { ListWidgetsTool } from "./tools/list-widgets-tool.js";
import { SchemaTool } from "./tools/schema-tool.js";

/**
 * Central registry for all available tools
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  registerDefaultTools() {
    this.registerTool(new SchemaTool());
    this.registerTool(new ListWidgetsTool());
  }

  /**
   * Register a tool
   * @param {BaseTool} tool - Tool instance to register
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all registered tools
   * @returns {BaseTool[]} Array of tool instances
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   * @param {string} name - Tool name
   * @returns {BaseTool|undefined} Tool instance or undefined
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Get tool definitions for AI API
   * @returns {Object[]} Array of tool definitions
   */
  getToolDefinitions() {
    return this.getAllTools().map((tool) => tool.getDefinition());
  }

  /**
   * Generate dynamic system prompt based on registered tools
   * @returns {string} Complete system prompt
   */
  generateSystemPrompt() {
    const tools = this.getAllTools();

    // Generate tool list
    const toolList = tools
      .map((tool) => `- ${tool.name}: ${tool.getPromptDescription()}`)
      .join("\n");

    // Generate usage guidance
    const usageGuidance = tools
      .map((tool) => `- ${tool.getUsageGuidance()}`)
      .join("\n");

    // Generate examples
    const examples = [];
    for (const tool of tools) {
      const queries = tool.getExampleQueries();
      for (const query of queries) {
        examples.push(`- "${query}" → Use ${tool.name}`);
      }
    }

    // Special multi-tool examples
    if (tools.length > 1) {
      examples.push(
        `- "What data is available and what am I currently visualizing?" → Use both tools`,
      );
      examples.push(
        `- "Tell me about my dashboard" → Use list_widgets first, then get_schema_info if needed`,
      );
    }

    return `You are an AI assistant for Insight Magician, a data visualization tool that helps users explore and analyze their databases.

You have access to ${tools.length} ${tools.length === 1 ? "tool" : "tools"}:
${toolList}

Use these tools strategically based on what the user is asking:
${usageGuidance}
- You can use multiple tools together to provide comprehensive assistance

Your role is to help users understand their data and manage their dashboard. You can assist with:

**Database Exploration:**
- Using get_schema_info to explore database structure when users ask about tables or data
- Explaining database schema and relationships based on the retrieved information
- Suggesting what types of analysis might be possible based on the available data

**Dashboard Awareness:**
- Using list_widgets to understand what widgets are currently on the dashboard
- Helping users understand their current visualizations and their status
- Providing context about existing widgets when suggesting new analysis

**General Guidance:**
- Providing guidance on data exploration techniques
- Answering questions about database structure and dashboard state
- Suggesting improvements to existing widgets or new visualizations to create

**Tool Usage Examples:**
${examples.join("\n")}

Keep your responses concise and focused on helping users understand and explore their data while being aware of their current dashboard state.`;
  }
}

// Create singleton instance
export const toolRegistry = new ToolRegistry();
