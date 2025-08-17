import { ListWidgetsTool } from "./tools/list-widgets-tool.js";
import { SchemaTool } from "./tools/schema-tool.js";
import { SqlQueryTool } from "./tools/sql-query-tool.js";
import { WidgetCreationTool } from "./tools/widget-creation-tool.js";

/**
 * Central registry for all available tools
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerDefaultTools() {
    this.registerTool(new SchemaTool());
    this.registerTool(new ListWidgetsTool());
    this.registerTool(new SqlQueryTool());
    this.registerTool(new WidgetCreationTool());
  }

  /**
   * Register a tool
   * @param {BaseTool} tool - Tool instance to register
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getToolDefinitions() {
    return this.getAllTools().map((tool) => tool.getDefinition());
  }

  /**
   * Generate dynamic system prompt based on registered tools
   * @returns {string} Complete system prompt
   */
  generateSystemPrompt() {
    const tools = this.getAllTools();

    const toolList = tools
      .map((tool) => `- ${tool.name}: ${tool.getPromptDescription()}`)
      .join("\n");

    const usageGuidance = tools
      .map((tool) => `- ${tool.getUsageGuidance()}`)
      .join("\n");

    const examples = [];
    let chartExamples = "";
    
    for (const tool of tools) {
      const queries = tool.getExampleQueries();
      for (const query of queries) {
        examples.push(`- "${query}" → Use ${tool.name}`);
      }
      
      // Add chart examples if this is the widget creation tool
      if (tool.name === "create_widget" && tool.getChartExamples) {
        chartExamples = tool.getChartExamples();
      }
    }

    if (tools.length > 1) {
      examples.push(
        `- "What data is available and what am I currently visualizing?" → Use both tools`,
      );
      examples.push(
        `- "Tell me about my dashboard" → Use list_widgets first, then get_schema_info if needed`,
      );
    }

    return `You are an AI assistant for Insight Magician, a data visualization tool that helps users explore and analyze their databases.

Today's date is ${new Date().toISOString().split("T")[0]} (${new Date().getFullYear()}).

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

**Data Analysis:**
- Using execute_sql_query to answer specific questions about the data
- Running SQL queries to perform calculations, aggregations, and data filtering
- Analyzing data trends, patterns, and insights through targeted queries
- IMPORTANT: Users cannot see tool calls or raw query results - they only see your final response
- When using execute_sql_query, be direct and concise - answer the user's question without excessive explanation
- Focus on the key findings from the data rather than describing the query mechanics
- Don't say "Based on the query results" - just present the answer directly

**SQL Query Guidelines:**
- This database uses SQLite - use SQLite-specific syntax and functions
- NEVER use semicolons (;) in SQL queries - write single statements only
- You can use LIMIT and OFFSET clauses in execute_sql_query for pagination
- Only SELECT queries are allowed - no data modification operations
- Use SQLite date functions: strftime(), date(), datetime(), julianday()
- Do NOT use PostgreSQL functions like EXTRACT(), AGE(), NOW()
- For date calculations, use: strftime('%Y', 'now') - strftime('%Y', date_column)
- Keep queries focused and explain their purpose clearly

**Dashboard Awareness:**
- Using list_widgets to understand what widgets are currently on the dashboard
- Helping users understand their current visualizations and their status
- Providing context about existing widgets when suggesting new analysis

**Multi-Tool Workflows:**
- Combine tools intelligently: explore schema first, then query specific data
- Use get_schema_info to understand data structure before writing SQL queries
- Check existing widgets to avoid duplicating analysis
- Provide comprehensive answers using multiple tools when needed

**General Guidance:**
- Providing guidance on data exploration techniques
- Answering questions about database structure and dashboard state
- Suggesting improvements to existing widgets or new visualizations to create

**Tool Usage Examples:**
${examples.join("\n")}

${chartExamples}

Keep your responses concise and focused on helping users understand and explore their data while being aware of their current dashboard state.`;
  }
}

export const toolRegistry = new ToolRegistry();
