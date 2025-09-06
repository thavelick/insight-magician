import { DatabaseManager } from "../database.js";
import { BaseTool } from "./base-tool.js";

import { logger } from "../logger.js";
/**
 * Schema Tool - Get database table structure and information
 */
export class SchemaTool extends BaseTool {
  constructor() {
    super("get_schema_info", "Get database table structure and information");
  }

  getDefinition() {
    return {
      type: "function",
      function: {
        name: "get_schema_info",
        description:
          "Get database table structure and information including columns, types, and row counts",
        parameters: {
          type: "object",
          properties: {
            tableName: {
              type: "string",
              description:
                "Specific table name to get info for (optional). If not provided, returns info for all tables.",
            },
          },
          required: [],
        },
      },
    };
  }

  getPromptDescription() {
    return "Get database table structure and information including columns, types, and row counts";
  }

  getUsageGuidance() {
    return "Use get_schema_info when users ask about their database structure, tables, or columns";
  }

  getExampleQueries() {
    return [
      "What tables do I have?",
      "Show me the structure of my database",
      "What columns are in the users table?",
      "What data is available in my database?",
    ];
  }

  validateParameters(parameters) {
    // tableName is optional, so minimal validation
    if (
      parameters.tableName !== undefined &&
      typeof parameters.tableName !== "string"
    ) {
      return {
        valid: false,
        error: "tableName must be a string if provided",
      };
    }

    return { valid: true };
  }

  async execute(parameters, context) {
    try {
      // Get the database file path from context
      const { databasePath } = context;

      if (!databasePath) {
        return {
          success: false,
          error: "No database file available. Please upload a database first.",
          action: "schema_error",
        };
      }

      const dbManager = new DatabaseManager(databasePath);

      try {
        const fullSchema = await dbManager.getSchema();

        // If specific table requested, filter to just that table
        if (parameters.tableName) {
          const tableName = parameters.tableName;

          if (!fullSchema[tableName]) {
            return {
              success: false,
              error: `Table '${tableName}' not found in database`,
              action: "table_not_found",
              availableTables: Object.keys(fullSchema),
            };
          }

          return {
            success: true,
            action: "schema_fetched",
            data: {
              tableName: tableName,
              tableInfo: fullSchema[tableName],
              summary: this._formatTableSummary(
                tableName,
                fullSchema[tableName],
              ),
            },
          };
        }

        // Return all tables

        return {
          success: true,
          action: "schema_fetched",
          data: {
            schema: fullSchema,
            tableNames: Object.keys(fullSchema),
          },
        };
      } finally {
        await dbManager.disconnect();
      }
    } catch (error) {
      logger.error("Schema tool execution failed:", error);

      // Handle specific database errors
      if (
        error.message?.includes("file is not a database") ||
        error.code === "SQLITE_NOTADB"
      ) {
        return {
          success: false,
          error: "Database file is corrupted or invalid",
          action: "database_error",
        };
      }

      return {
        success: false,
        error: `Failed to read database schema: ${error.message}`,
        action: "schema_error",
      };
    }
  }

  /**
   * Format a summary for a specific table
   */
  _formatTableSummary(tableName, tableInfo) {
    const columnCount = tableInfo.columns.length;
    const rowCount = tableInfo.rowCount;
    const primaryKeys = tableInfo.columns
      .filter((col) => col.primaryKey)
      .map((col) => col.name);

    return (
      `Table '${tableName}' has ${columnCount} columns and ${rowCount} rows. ` +
      `Primary key(s): ${primaryKeys.length > 0 ? primaryKeys.join(", ") : "none"}. ` +
      `Columns: ${tableInfo.columns.map((col) => `${col.name} (${col.type})`).join(", ")}.`
    );
  }
}
