import { DatabaseManager } from "../database.js";
import { validateSqlForWidget } from "../sqlValidator.js";
import { BaseTool } from "./base-tool.js";

/**
 * Widget Edit Tool - Modify properties of existing widgets
 */
export class WidgetEditTool extends BaseTool {
  constructor() {
    super("edit_widget", "Modify properties of existing widgets");
  }

  getDefinition() {
    return {
      type: "function",
      function: {
        name: "edit_widget",
        description:
          "Modify an existing widget's properties such as title, query, or chart function. Use this when users want to update, change, or improve existing widgets.",
        parameters: {
          type: "object",
          properties: {
            widgetId: {
              type: "integer",
              description:
                "The ID of the widget to edit. Use list_widgets first to see available widget IDs.",
            },
            title: {
              type: "string",
              description:
                "New title for the widget. Leave undefined to keep current title.",
            },
            query: {
              type: "string",
              description:
                "New SQLite SELECT query for the widget. Must be valid SQLite syntax without LIMIT/OFFSET. Leave undefined to keep current query.",
            },
            widgetType: {
              type: "string",
              enum: ["data-table", "graph"],
              description:
                "Change widget type between 'data-table' and 'graph'. Leave undefined to keep current type.",
            },
            chartFunction: {
              type: "string",
              description:
                "For graph widgets: new JavaScript function that creates the D3.js chart. Function signature: createChart(data, svg, d3, width, height). Only needed when widgetType is 'graph'.",
            },
            width: {
              type: "integer",
              minimum: 1,
              maximum: 4,
              description:
                "New widget width in grid units (1-4). Leave undefined to keep current width.",
            },
            height: {
              type: "integer",
              minimum: 1,
              maximum: 4,
              description:
                "New widget height in grid units (1-4). Leave undefined to keep current height.",
            },
          },
          required: ["widgetId"],
        },
      },
    };
  }

  getPromptDescription() {
    return "Modify properties of existing widgets";
  }

  getUsageGuidance() {
    return "Use edit_widget when users want to update, change, or improve existing widgets - titles, queries, chart types, visualization functions, or widget size";
  }

  getExampleQueries() {
    return [
      "Change the title of widget 1 to 'Monthly Revenue'",
      "Update the sales chart to show data for this year only",
      "Convert that table widget to a bar chart",
      "Fix the query in the customer widget",
      "Update widget 2 to use a different chart type",
      "Modify the title and query of the top widget",
      "Make widget 1 bigger",
      "Resize the chart to be smaller",
      "Change widget 2 to be 3x2 size",
    ];
  }

  async execute(args, context) {
    try {
      const {
        widgetId,
        title,
        query,
        widgetType,
        chartFunction,
        width,
        height,
      } = args;

      // Validate required parameters
      if (widgetId === undefined || widgetId === null) {
        return {
          success: false,
          error: "Missing required parameter: widgetId is required",
        };
      }

      // Validate widget ID is a positive integer
      if (!Number.isInteger(widgetId) || widgetId <= 0) {
        return {
          success: false,
          error: "widgetId must be a positive integer",
        };
      }

      // Get current widgets from context
      const { widgets = [] } = context;
      const existingWidget = widgets.find((w) => w.id === widgetId);

      if (!existingWidget) {
        return {
          success: false,
          error: `Widget with ID ${widgetId} not found. Use list_widgets to see available widgets.`,
        };
      }

      // Validate widget type if provided
      if (widgetType && !["data-table", "graph"].includes(widgetType)) {
        return {
          success: false,
          error: "Invalid widgetType. Must be 'data-table' or 'graph'",
        };
      }

      // Validate dimensions if provided
      if (width !== undefined && (width < 1 || width > 4)) {
        return {
          success: false,
          error: "Width must be between 1 and 4",
        };
      }

      if (height !== undefined && (height < 1 || height > 4)) {
        return {
          success: false,
          error: "Height must be between 1 and 4",
        };
      }

      // Determine final widget type
      const finalWidgetType = widgetType || existingWidget.type;

      // For graph widgets, chartFunction is required
      if (
        finalWidgetType === "graph" &&
        !chartFunction &&
        existingWidget.type !== "graph"
      ) {
        return {
          success: false,
          error:
            "chartFunction is required when converting to graph widget or creating new graph widget",
        };
      }

      // Validate SQL query if provided
      const finalQuery = query ? query.trim() : existingWidget.query;
      if (query) {
        const validationResult = validateSqlForWidget(query);
        if (!validationResult.isValid) {
          return {
            success: false,
            error: `Invalid SQL query: ${validationResult.error}`,
          };
        }
      }

      // Validate chart function if provided
      if (chartFunction && finalWidgetType === "graph") {
        if (
          !chartFunction.includes("function") ||
          !chartFunction.includes("createChart")
        ) {
          return {
            success: false,
            error:
              "chartFunction must be a JavaScript function named 'createChart'",
          };
        }
      }

      // Execute query to get new data (if query changed or converting to different type)
      let queryResults = null;
      if (query || widgetType) {
        try {
          const { databasePath } = context;
          if (!databasePath) {
            return {
              success: false,
              error: "No database connection available",
            };
          }

          const dbManager = new DatabaseManager(databasePath);
          await dbManager.connect();

          // Execute query directly using the prepared statement
          const rows = dbManager.db.prepare(finalQuery).all();

          // Format results like the query endpoint
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          queryResults = {
            columns,
            rows: rows.map((row) => columns.map((col) => row[col])),
            totalRows: rows.length,
            hasMore: false,
          };

          await dbManager.disconnect();
        } catch (queryError) {
          return {
            success: false,
            error: `Query execution failed: ${queryError.message}`,
          };
        }
      }

      // Create updated widget configuration
      const updatedConfig = {
        id: widgetId,
        title: title ? title.trim() : existingWidget.title,
        widgetType: finalWidgetType,
        query: finalQuery,
        width:
          width !== undefined ? width : existingWidget.dimensions?.width || 2,
        height:
          height !== undefined
            ? height
            : existingWidget.dimensions?.height || 2,
      };

      // Add query results if we executed a new query
      if (queryResults) {
        updatedConfig.results = queryResults;
      }

      // Add chart function for graph widgets
      if (finalWidgetType === "graph") {
        if (chartFunction) {
          updatedConfig.chartFunction = chartFunction.trim();
        } else if (existingWidget.chartFunction) {
          // Keep existing chart function if none provided
          updatedConfig.chartFunction = existingWidget.chartFunction;
        }
      }

      // Prepare summary of changes made
      const changes = [];
      if (title && title.trim() !== existingWidget.title) {
        changes.push("title");
      }
      if (query && query.trim() !== existingWidget.query) {
        changes.push("query");
      }
      if (widgetType && widgetType !== existingWidget.type) {
        changes.push("type");
      }
      if (chartFunction) {
        changes.push("chart function");
      }
      if (
        width !== undefined &&
        width !== (existingWidget.dimensions?.width || 2)
      ) {
        changes.push("width");
      }
      if (
        height !== undefined &&
        height !== (existingWidget.dimensions?.height || 2)
      ) {
        changes.push("height");
      }

      const changesSummary =
        changes.length > 0 ? changes.join(", ") : "configuration";

      return {
        success: true,
        action: "widget_updated",
        widgetConfig: updatedConfig,
        message: `Successfully updated widget ${widgetId} (${changesSummary})${queryResults ? ` with ${queryResults.totalRows} rows of data` : ""}`,
      };
    } catch (error) {
      console.error("Error in WidgetEditTool:", error);
      return {
        success: false,
        error: `Failed to edit widget: ${error.message}`,
      };
    }
  }
}
