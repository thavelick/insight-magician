import { join } from "node:path";
import { DatabaseManager } from "../lib/database.js";
import { validateSql } from "../lib/sqlValidator.js";

const UPLOADS_DIR = "./uploads";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 1000;

export async function handleQuery(request) {
  try {
    const body = await request.json();
    const { filename, query, page = 1, pageSize = DEFAULT_PAGE_SIZE } = body;

    // Validate required parameters
    if (!filename || !query) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: filename and query",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate and sanitize pagination parameters
    const validPageSize = Math.min(
      Math.max(1, Number.parseInt(pageSize, 10)),
      MAX_PAGE_SIZE,
    );
    const validPage = Math.max(1, Number.parseInt(page, 10));
    const offset = (validPage - 1) * validPageSize;

    // Security: Validate filename to prevent path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if database file exists
    const filePath = join(UPLOADS_DIR, filename);
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response(
        JSON.stringify({ error: "Database file not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Initialize database manager
    const dbManager = new DatabaseManager(filePath);
    await dbManager.connect();

    try {
      // Validate SQL query using centralized validator
      const validation = validateSql(query);
      if (!validation.isValid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Execute the query with pagination
      const results = await executeQueryWithPagination(
        dbManager,
        query,
        validPage,
        validPageSize,
        offset,
      );

      await dbManager.disconnect();

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (queryError) {
      await dbManager.disconnect();

      return new Response(
        JSON.stringify({
          error: `SQL Error: ${queryError.message}`,
          type: "sql_error",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Query execution error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        type: "server_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function executeQueryWithPagination(
  dbManager,
  query,
  page,
  pageSize,
  offset,
) {
  // First, get total count by wrapping the query in a COUNT(*)
  let totalRows = 0;
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
  const paginatedQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`;
  console.log("=== Query Debug ===");
  console.log("Original query:", query);
  console.log("Paginated query:", paginatedQuery);
  console.log("Page:", page, "PageSize:", pageSize, "Offset:", offset);

  const rows = dbManager.db.prepare(paginatedQuery).all();
  console.log("Returned rows:", rows.length);
  console.log("Total rows from count:", totalRows);

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
