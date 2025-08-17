import { DatabaseManager } from "../database.js";
import { validateSqlForWidget } from "../sqlValidator.js";
import { BaseTool } from "./base-tool.js";

/**
 * Widget Creation Tool - Create new chart or table widgets on the dashboard
 */
export class WidgetCreationTool extends BaseTool {
  constructor() {
    super(
      "create_widget",
      "Create new chart or table widgets on the dashboard",
    );
  }

  getDefinition() {
    return {
      type: "function",
      function: {
        name: "create_widget",
        description:
          "Create a new data visualization widget (chart or table) on the dashboard. Use this when users want to visualize data or create charts/tables.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description:
                "The title for the widget. Should be descriptive and user-friendly.",
            },
            widgetType: {
              type: "string",
              enum: ["data-table", "graph"],
              description:
                "Type of widget to create. Use 'data-table' for tabular data, 'graph' for charts/visualizations.",
            },
            query: {
              type: "string",
              description:
                "SQLite SELECT query to get the data for this widget. Must be valid SQLite syntax without LIMIT/OFFSET (widget handles pagination).",
            },
            width: {
              type: "integer",
              minimum: 1,
              maximum: 4,
              description:
                "Widget width in grid units (1-4). Default is 2. Larger values for more content.",
            },
            height: {
              type: "integer",
              minimum: 1,
              maximum: 4,
              description:
                "Widget height in grid units (1-4). Default is 2. Larger values for more content.",
            },
            chartFunction: {
              type: "string",
              description:
                "For graph widgets only: JavaScript function that creates the D3.js chart. Function signature: createChart(data, svg, d3, width, height). Required for widgetType='graph'.",
            },
          },
          required: ["title", "widgetType", "query"],
        },
      },
    };
  }

  getPromptDescription() {
    return "Create new chart or table widgets on the dashboard";
  }

  getUsageGuidance() {
    return "Use create_widget when users want to visualize data, create charts, or add tables to their dashboard";
  }

  getChartExamples() {
    return `
**Chart Function Example:**
\`\`\`javascript
function createChart(data, svg, d3, width, height) {
  const radius = Math.min(width, height) / 2 - 20;
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  svg.append('g').attr('transform', \`translate(\${width/2}, \${height/2})\`)
    .selectAll('path').data(pie(data)).enter().append('path')
    .attr('d', arc).attr('fill', (d, i) => d3.schemeCategory10[i]);
  return svg;
}
\`\`\``;
  }

  getExampleQueries() {
    return [
      "Create a bar chart showing sales by category",
      "Make a table with the top 10 customers",
      "Show me a pie chart of product distribution",
      "Create a chart visualizing revenue over time",
      "Add a widget showing customer demographics",
    ];
  }

  async execute(args, context) {
    try {
      const {
        title,
        widgetType,
        query,
        width = 2,
        height = 2,
        chartFunction,
      } = args;

      // Validate required parameters
      if (!title || !widgetType || !query) {
        return {
          success: false,
          error:
            "Missing required parameters: title, widgetType, and query are required",
        };
      }

      // Validate widget type
      if (!["data-table", "graph"].includes(widgetType)) {
        return {
          success: false,
          error: "Invalid widgetType. Must be 'data-table' or 'graph'",
        };
      }

      // Validate dimensions
      if (width < 1 || width > 4 || height < 1 || height > 4) {
        return {
          success: false,
          error: "Width and height must be between 1 and 4",
        };
      }

      // For graph widgets, chartFunction is required
      if (widgetType === "graph" && !chartFunction) {
        return {
          success: false,
          error: "chartFunction is required for graph widgets",
        };
      }

      // Validate SQL query
      const validationResult = validateSqlForWidget(query);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Invalid SQL query: ${validationResult.error}`,
        };
      }

      // Execute query to get initial data
      let queryResults = null;
      try {
        // Get database path from context (passed by tool executor)
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
        const rows = dbManager.db.prepare(query).all();

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

      // Generate a unique widget ID (timestamp-based)
      const widgetId = `widget_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Create widget configuration
      const widgetConfig = {
        id: widgetId,
        title: title.trim(),
        widgetType,
        query: query.trim(),
        width,
        height,
        results: queryResults,
      };

      // Add chart function for graph widgets
      if (widgetType === "graph" && chartFunction) {
        // Basic validation of chart function
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
        widgetConfig.chartFunction = chartFunction.trim();
      }

      return {
        success: true,
        action: "widget_created",
        widgetConfig,
        message: `Successfully created ${widgetType} widget "${title}" with ${queryResults.totalRows} rows of data`,
      };
    } catch (error) {
      console.error("Error in WidgetCreationTool:", error);
      return {
        success: false,
        error: `Failed to create widget: ${error.message}`,
      };
    }
  }
}
