import { DatabaseManager } from "../database.js";
import { validateSqlForTool } from "../sqlValidator.js";
import { BaseTool } from "./base-tool.js";

/**
 * SQL Query Tool - Execute SQL queries to analyze data and answer questions
 */
export class SqlQueryTool extends BaseTool {
  constructor() {
    super(
      "execute_sql_query",
      "Run SQL queries to analyze data and answer questions",
    );
  }

  getDefinition() {
    return {
      type: "function",
      function: {
        name: "execute_sql_query",
        description:
          "Execute SQLite SELECT queries to analyze data and answer user questions. Use SQLite syntax and functions only.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The SQLite SELECT query to execute. Must be a valid SQLite SELECT statement using SQLite syntax and functions (strftime, julianday, etc.). You can use LIMIT/OFFSET for pagination. Never use semicolons or PostgreSQL functions.",
            },
            explanation: {
              type: "string",
              description:
                "Brief explanation of what this query does and why it answers the user's question.",
            },
            pageSize: {
              type: "number",
              description:
                "Number of rows to return (default: 50, max: 200). Use smaller values for large datasets.",
              minimum: 1,
              maximum: 200,
            },
          },
          required: ["query", "explanation"],
        },
      },
    };
  }

  getPromptDescription() {
    return "Execute SQL queries to analyze data and answer user questions";
  }

  getUsageGuidance() {
    return "Use execute_sql_query when users ask questions that require data analysis, aggregation, or specific data retrieval";
  }

  getExampleQueries() {
    return [
      "How many users are in the database?",
      "What are the top 5 selling products?",
      "Show me sales data for the last month",
      "What's the average order value?",
      "Which customers have the most orders?",
    ];
  }

  validateParameters(parameters) {
    if (!parameters.query || typeof parameters.query !== "string") {
      return {
        valid: false,
        error: "query is required and must be a string",
      };
    }

    if (!parameters.explanation || typeof parameters.explanation !== "string") {
      return {
        valid: false,
        error: "explanation is required and must be a string",
      };
    }

    if (parameters.pageSize !== undefined) {
      const pageSize = Number(parameters.pageSize);
      if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 200) {
        return {
          valid: false,
          error: "pageSize must be a number between 1 and 200",
        };
      }
    }

    // Validate SQL query using tool-specific validator (allows LIMIT/OFFSET)
    const sqlValidation = validateSqlForTool(parameters.query);
    if (!sqlValidation.isValid) {
      return {
        valid: false,
        error: `SQL validation failed: ${sqlValidation.error}`,
      };
    }

    return { valid: true };
  }

  async execute(parameters, context) {
    try {
      console.log("🔧 SqlQueryTool: Executing SQL query", {
        query: parameters.query,
        explanation: parameters.explanation,
        pageSize: parameters.pageSize || 50,
      });

      // Get the database file path from context
      const { databasePath } = context;

      if (!databasePath) {
        return {
          success: false,
          error: "No database file available. Please upload a database first.",
          action: "sql_error",
        };
      }

      const dbManager = new DatabaseManager(databasePath);

      try {
        // Execute query with pagination (reusing logic from query route)
        const pageSize = Math.min(parameters.pageSize || 50, 200);
        const page = 1; // Always start with first page for tool calls
        const offset = 0;

        const results = await this.executeQueryWithPagination(
          dbManager,
          parameters.query,
          page,
          pageSize,
          offset,
        );

        console.log("✅ SqlQueryTool: Query executed successfully", {
          totalRows: results.totalRows,
          returnedRows: results.rows.length,
          columns: results.columns.length,
          explanation: parameters.explanation,
        });

        // Format results for AI consumption
        const formattedResults = this.formatResultsForAI(results, parameters);

        return {
          success: true,
          action: "sql_query_executed",
          data: formattedResults,
        };
      } finally {
        await dbManager.disconnect();
      }
    } catch (error) {
      console.error("❌ SqlQueryTool execution failed:", error);

      // Handle specific SQL errors
      if (error.message?.includes("no such table")) {
        return {
          success: false,
          error:
            "Table not found in database. Use get_schema_info to see available tables.",
          action: "sql_error",
        };
      }

      if (error.message?.includes("no such column")) {
        return {
          success: false,
          error:
            "Column not found. Use get_schema_info to see available columns.",
          action: "sql_error",
        };
      }

      if (error.message?.includes("syntax error")) {
        return {
          success: false,
          error: `SQL syntax error: ${error.message}`,
          action: "sql_error",
        };
      }

      return {
        success: false,
        error: `Query execution failed: ${error.message}`,
        action: "sql_error",
      };
    }
  }

  /**
   * Execute query with pagination (copied from query route)
   */
  async executeQueryWithPagination(dbManager, query, page, pageSize, offset) {
    await dbManager.connect();

    // Check if query already has LIMIT/OFFSET clauses
    const queryLower = query.toLowerCase().trim();
    // Match LIMIT/OFFSET with word boundaries to avoid false positives
    const hasLimit = /\blimit\b/.test(queryLower);
    const hasOffset = /\boffset\b/.test(queryLower);

    let finalQuery = query;
    let totalRows = 0;

    if (hasLimit || hasOffset) {
      // Query already has pagination - execute as-is
      console.log(
        "🔍 SqlQueryTool: Query already contains LIMIT/OFFSET, executing as-is",
      );
      const rows = dbManager.db.prepare(query).all();
      totalRows = rows.length; // Can't get accurate total when user controls pagination

      // Extract column names from the first row (if any)
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Convert rows from objects to arrays for consistency with existing UI
      const rowArrays = rows.map((row) => columns.map((col) => row[col]));

      return {
        success: true,
        columns,
        rows: rowArrays,
        totalRows,
        page: 1, // Unknown page when user controls pagination
        pageSize: rows.length,
        totalPages: 1, // Unknown total pages
        hasMore: false, // Unknown if there's more data
      };
    }

    // Query doesn't have pagination - add our own
    console.log("🔍 SqlQueryTool: No LIMIT/OFFSET detected, adding pagination");
    try {
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS count_query`;
      const countResult = dbManager.db.prepare(countQuery).get();
      totalRows = countResult.total;
    } catch (error) {
      // If count fails, execute original query to get row count
      // This is less efficient but works for complex queries
      const allResults = dbManager.db.prepare(query).all();
      totalRows = allResults.length;
    }

    // Execute the paginated query
    finalQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`;
    console.log("🔍 SqlQueryTool: Final query (with pagination):", finalQuery);
    const rows = dbManager.db.prepare(finalQuery).all();

    // Extract column names from the first row (if any)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Convert rows from objects to arrays for consistency with existing UI
    const rowArrays = rows.map((row) => columns.map((col) => row[col]));

    return {
      success: true,
      columns,
      rows: rowArrays,
      totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
      hasMore: page * pageSize < totalRows,
    };
  }

  /**
   * Format query results for AI consumption
   */
  formatResultsForAI(results, parameters) {
    const { columns, rows, totalRows, pageSize, hasMore } = results;

    // Create summary information
    const summary = {
      query: parameters.query,
      explanation: parameters.explanation,
      totalRows,
      returnedRows: rows.length,
      columns: columns.length,
      columnNames: columns,
      hasMoreData: hasMore,
    };

    // Include sample data (limit to prevent token overflow)
    const maxSampleRows = Math.min(rows.length, 10);
    const sampleData = rows.slice(0, maxSampleRows);

    // Create human-readable summary
    let textSummary = `Query executed successfully: ${parameters.explanation}\n`;
    textSummary += `Found ${totalRows} total rows, showing first ${rows.length}.\n`;
    textSummary += `Columns: ${columns.join(", ")}\n`;

    if (rows.length > 0) {
      textSummary += `\nSample data (first ${maxSampleRows} rows):\n`;

      // Create a simple table format
      const maxColWidth = 20;
      const header = columns
        .map((col) => col.substring(0, maxColWidth).padEnd(maxColWidth))
        .join(" | ");
      textSummary += `${header}\n`;
      textSummary += `${"-".repeat(header.length)}\n`;

      for (const row of sampleData) {
        const formattedRow = row
          .map((cell) => {
            const cellStr = String(cell || "").substring(0, maxColWidth);
            return cellStr.padEnd(maxColWidth);
          })
          .join(" | ");
        textSummary += `${formattedRow}\n`;
      }

      if (hasMore) {
        textSummary += `\n... and ${totalRows - rows.length} more rows`;
      }
    } else {
      textSummary +=
        "\nNo data returned - query completed but found no matching records.";
    }

    return {
      summary,
      textSummary,
      results: {
        columns,
        rows: sampleData, // Only include sample for AI
        totalRows,
        hasMore,
      },
    };
  }
}
