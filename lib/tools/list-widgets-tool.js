import { BaseTool } from "./base-tool.js";

/**
 * Tool for listing current widgets on the dashboard
 */
export class ListWidgetsTool extends BaseTool {
  constructor() {
    super("list_widgets", "Get information about current widgets on dashboard");
  }

  /**
   * Get the AI API tool definition
   * @returns {Object} Tool definition object
   */
  getDefinition() {
    return {
      type: "function",
      function: {
        name: "list_widgets",
        description:
          "Get information about current widgets on the dashboard including their titles, types, queries, dimensions, and status",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    };
  }

  /**
   * Validate tool parameters
   * @param {Object} parameters - Parameters to validate
   * @returns {Object} Validation result {valid: boolean, error?: string}
   */
  validateParameters(parameters) {
    // This tool takes no parameters
    return { valid: true };
  }

  /**
   * Execute the tool - get current widget information
   * @param {Object} parameters - Tool parameters (empty for this tool)
   * @param {Object} context - Execution context (not needed for widget listing)
   * @returns {Promise<Object>} Execution result with widget information
   */
  async execute(parameters, context) {
    try {
      console.log(
        "🔧 ListWidgetsTool: Getting current widget state from frontend",
      );

      // Get widget state from sessionStorage (this is how widgets persist)
      const widgetData = this.getWidgetDataFromStorage();

      if (!widgetData || widgetData.length === 0) {
        return {
          success: true,
          action: "widgets_listed",
          data: {
            widgets: [],
            totalWidgets: 0,
            message: "No widgets currently on dashboard",
          },
        };
      }

      // Transform widget data into AI-friendly format
      const widgetInfo = widgetData.map((widget) => ({
        id: widget.id,
        title: widget.title || `Widget ${widget.id}`,
        type: widget.widgetType || "data-table",
        query: widget.query || "",
        dimensions: {
          width: widget.width || 2,
          height: widget.height || 2,
        },
        status: this.getWidgetStatus(widget),
        hasResults: !!(
          widget.results &&
          widget.results.rows &&
          widget.results.rows.length > 0
        ),
        resultCount:
          widget.results && widget.results.rows
            ? widget.results.rows.length
            : 0,
        isInEditMode: widget.isFlipped || false,
      }));

      console.log(
        "✅ ListWidgetsTool: Successfully retrieved widget information",
        {
          totalWidgets: widgetInfo.length,
          widgetIds: widgetInfo.map((w) => w.id),
        },
      );

      return {
        success: true,
        action: "widgets_listed",
        data: {
          widgets: widgetInfo,
          totalWidgets: widgetInfo.length,
          summary: this.generateWidgetSummary(widgetInfo),
        },
      };
    } catch (error) {
      console.error("❌ ListWidgetsTool execution failed:", error);
      return {
        success: false,
        error: `Failed to list widgets: ${error.message}`,
        action: "tool_error",
      };
    }
  }

  /**
   * Get widget data from sessionStorage
   * @returns {Array} Array of widget data objects
   */
  getWidgetDataFromStorage() {
    try {
      const savedWidgets = sessionStorage.getItem("widgets");
      if (!savedWidgets) {
        return [];
      }
      return JSON.parse(savedWidgets);
    } catch (error) {
      console.warn("Failed to parse widget data from sessionStorage:", error);
      return [];
    }
  }

  /**
   * Determine widget status based on its data
   * @param {Object} widget - Widget data object
   * @returns {string} Status description
   */
  getWidgetStatus(widget) {
    if (!widget.query || widget.query.trim() === "") {
      return "empty (no query set)";
    }

    if (
      widget.results &&
      widget.results.rows &&
      widget.results.rows.length > 0
    ) {
      return "showing data";
    }

    if (
      widget.results &&
      widget.results.rows &&
      widget.results.rows.length === 0
    ) {
      return "no results (query returned empty)";
    }

    return "configured but not run";
  }

  /**
   * Generate a human-readable summary of the dashboard state
   * @param {Array} widgets - Array of widget info objects
   * @returns {string} Summary text
   */
  generateWidgetSummary(widgets) {
    if (widgets.length === 0) {
      return "Dashboard is empty - no widgets created yet";
    }

    const typeCount = widgets.reduce((acc, widget) => {
      acc[widget.type] = (acc[widget.type] || 0) + 1;
      return acc;
    }, {});

    const withData = widgets.filter((w) => w.hasResults).length;
    const withoutQuery = widgets.filter(
      (w) => !w.query || w.query.trim() === "",
    ).length;

    const typeSummary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ");

    return `Dashboard has ${widgets.length} widget${widgets.length > 1 ? "s" : ""}: ${typeSummary}. ${withData} showing data, ${withoutQuery} need queries.`;
  }
}
