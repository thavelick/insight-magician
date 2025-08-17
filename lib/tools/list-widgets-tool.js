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
   * @param {Object} context - Execution context (may contain widgets from frontend)
   * @returns {Promise<Object>} Execution result with widget information
   */
  async execute(parameters, context) {
    try {
      console.log("🔧 ListWidgetsTool: Getting current widget state");

      // Get widget data from context first (frontend usage), fallback to sessionStorage (unit tests)
      let widgetData = [];
      if (context?.widgets && Array.isArray(context.widgets)) {
        widgetData = context.widgets;
        console.log("🔧 Using widgets from context");
      } else {
        widgetData = this.getWidgetDataFromStorage();
        console.log("🔧 Using widgets from sessionStorage");
      }

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
      // Handle both frontend format (context.widgets) and sessionStorage format
      const widgetInfo = widgetData.map((widget) => ({
        id: widget.id,
        title: widget.title || `Widget ${widget.id}`,
        type: widget.type || widget.widgetType || "data-table",
        query: widget.query || "",
        dimensions: widget.dimensions || {
          width: widget.width || 2,
          height: widget.height || 2,
        },
        status: this.getWidgetStatus(widget),
        hasResults:
          widget.hasResults !== undefined
            ? widget.hasResults
            : !!(widget.results?.rows && widget.results.rows.length > 0),
        resultCount:
          widget.resultCount !== undefined
            ? widget.resultCount
            : widget.results?.rows
              ? widget.results.rows.length
              : 0,
        isInEditMode:
          widget.isInEditMode !== undefined
            ? widget.isInEditMode
            : widget.isFlipped || false,
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
   * Get widget data from sessionStorage (fallback for unit tests)
   * @returns {Array} Array of widget data objects
   */
  getWidgetDataFromStorage() {
    try {
      if (typeof sessionStorage === "undefined") {
        return [];
      }
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
   * @param {Object} widget - Widget data object (either frontend or sessionStorage format)
   * @returns {string} Status description
   */
  getWidgetStatus(widget) {
    if (!widget.query || widget.query.trim() === "") {
      return "empty (no query set)";
    }

    // Handle both frontend format (hasResults) and sessionStorage format (results object)
    const hasData =
      widget.hasResults !== undefined
        ? widget.hasResults
        : !!(widget.results?.rows && widget.results.rows.length > 0);

    if (hasData) {
      return "showing data";
    }

    // Check if results exist but are empty
    const hasEmptyResults =
      widget.resultCount === 0 ||
      (widget.results?.rows && widget.results.rows.length === 0);

    if (hasEmptyResults) {
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
