import { expect, mock, test } from "bun:test";
import { SqlQueryTool } from "../../../../lib/tools/sql-query-tool.js";

// Mock the database manager and SQL validator
const mockDatabaseManager = {
  connect: mock(() => Promise.resolve()),
  disconnect: mock(() => Promise.resolve()),
  db: {
    prepare: mock((query) => ({
      get: mock(() => ({ total: 10 })),
      all: mock(() => [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ]),
    })),
  },
};

const mockValidateSqlForTool = mock((query) => ({ isValid: true }));

// Mock the imports
mock.module("../../../../lib/database.js", () => ({
  DatabaseManager: mock(() => mockDatabaseManager),
}));

mock.module("../../../../lib/sqlValidator.js", () => ({
  validateSqlForTool: mockValidateSqlForTool,
}));

function createTool() {
  // Reset mocks
  mockDatabaseManager.connect.mockClear();
  mockDatabaseManager.disconnect.mockClear();
  mockDatabaseManager.db.prepare.mockClear();
  mockValidateSqlForTool.mockClear();
  return new SqlQueryTool();
}

test("SqlQueryTool should have correct name and description", () => {
  const tool = createTool();
  expect(tool.name).toBe("execute_sql_query");
  expect(tool.description).toBe(
    "Run SQL queries to analyze data and answer questions",
  );
});

test("SqlQueryTool should return proper tool definition", () => {
  const tool = createTool();
  const definition = tool.getDefinition();

  expect(definition.type).toBe("function");
  expect(definition.function.name).toBe("execute_sql_query");
  expect(definition.function.description).toContain("Execute SQLite SELECT queries");
  expect(definition.function.parameters.required).toEqual([
    "query",
    "explanation",
  ]);

  // Check parameter properties
  const props = definition.function.parameters.properties;
  expect(props.query).toBeDefined();
  expect(props.explanation).toBeDefined();
  expect(props.pageSize).toBeDefined();
  expect(props.pageSize.minimum).toBe(1);
  expect(props.pageSize.maximum).toBe(200);
});

test("SqlQueryTool should provide proper prompt description", () => {
  const tool = createTool();
  const description = tool.getPromptDescription();
  expect(description).toBe(
    "Execute SQL queries to analyze data and answer user questions",
  );
});

test("SqlQueryTool should provide usage guidance", () => {
  const tool = createTool();
  const guidance = tool.getUsageGuidance();
  expect(guidance).toContain("data analysis");
  expect(guidance).toContain("aggregation");
  expect(guidance).toContain("data retrieval");
});

test("SqlQueryTool should provide example queries", () => {
  const tool = createTool();
  const examples = tool.getExampleQueries();
  expect(examples).toBeArray();
  expect(examples.length).toBeGreaterThan(0);
  expect(examples).toContain("How many users are in the database?");
  expect(examples).toContain("What are the top 5 selling products?");
});

test("SqlQueryTool should validate required query parameter", () => {
  const tool = createTool();
  const result = tool.validateParameters({});
  expect(result.valid).toBe(false);
  expect(result.error).toContain("query is required");
});

test("SqlQueryTool should validate required explanation parameter", () => {
  const tool = createTool();
  const result = tool.validateParameters({ query: "SELECT * FROM users" });
  expect(result.valid).toBe(false);
  expect(result.error).toContain("explanation is required");
});

test("SqlQueryTool should validate pageSize range", () => {
  const tool = createTool();

  let result = tool.validateParameters({
    query: "SELECT * FROM users",
    explanation: "test",
    pageSize: 0,
  });
  expect(result.valid).toBe(false);
  expect(result.error).toContain("pageSize must be a number between 1 and 200");

  result = tool.validateParameters({
    query: "SELECT * FROM users",
    explanation: "test",
    pageSize: 250,
  });
  expect(result.valid).toBe(false);
  expect(result.error).toContain("pageSize must be a number between 1 and 200");
});

test("SqlQueryTool should validate SQL using validator", () => {
  const tool = createTool();
  mockValidateSqlForTool.mockReturnValueOnce({
    isValid: false,
    error: "SQL validation failed",
  });

  const result = tool.validateParameters({
    query: "DROP TABLE users",
    explanation: "test",
  });

  expect(result.valid).toBe(false);
  expect(result.error).toContain("SQL validation failed");
  expect(mockValidateSqlForTool).toHaveBeenCalledWith("DROP TABLE users");
});

test("SqlQueryTool should pass valid parameters", () => {
  const tool = createTool();
  const result = tool.validateParameters({
    query: "SELECT * FROM users",
    explanation: "Get all users",
    pageSize: 50,
  });

  expect(result.valid).toBe(true);
  expect(mockValidateSqlForTool).toHaveBeenCalledWith("SELECT * FROM users");
});

test("SqlQueryTool should allow LIMIT/OFFSET in queries", () => {
  const tool = createTool();
  const result = tool.validateParameters({
    query: "SELECT * FROM users LIMIT 10 OFFSET 20",
    explanation: "Get paginated users",
  });

  expect(result.valid).toBe(true);
  expect(mockValidateSqlForTool).toHaveBeenCalledWith(
    "SELECT * FROM users LIMIT 10 OFFSET 20",
  );
});

test("SqlQueryTool should execute query successfully", async () => {
  const tool = createTool();
  const parameters = {
    query: "SELECT * FROM users",
    explanation: "Get all users",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(true);
  expect(result.action).toBe("sql_query_executed");
  expect(result.data).toBeDefined();
  expect(result.data.summary.query).toBe("SELECT * FROM users");
  expect(result.data.summary.explanation).toBe("Get all users");
  expect(mockDatabaseManager.connect).toHaveBeenCalled();
  expect(mockDatabaseManager.disconnect).toHaveBeenCalled();
});

test("SqlQueryTool should handle missing database path", async () => {
  const tool = createTool();
  const parameters = {
    query: "SELECT * FROM users",
    explanation: "Get all users",
  };
  const context = {};

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "No database file available. Please upload a database first.",
  );
  expect(result.action).toBe("sql_error");
});

test("SqlQueryTool should handle table not found errors", async () => {
  // Create a separate mock for this test
  const errorDbManager = {
    connect: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
    db: {
      prepare: mock(() => {
        throw new Error("no such table: nonexistent");
      }),
    },
  };

  // Mock the DatabaseManager constructor for this test
  const originalDbManager = mockDatabaseManager;
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => errorDbManager),
  }));

  const tool = new SqlQueryTool();

  const parameters = {
    query: "SELECT * FROM nonexistent",
    explanation: "Query nonexistent table",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "Table not found in database. Use get_schema_info to see available tables.",
  );
  expect(result.action).toBe("sql_error");

  // Restore original mock
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => originalDbManager),
  }));
});

test("SqlQueryTool should handle column not found errors", async () => {
  // Create a separate mock for this test
  const errorDbManager = {
    connect: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
    db: {
      prepare: mock(() => {
        throw new Error("no such column: nonexistent_column");
      }),
    },
  };

  // Mock the DatabaseManager constructor for this test
  const originalDbManager = mockDatabaseManager;
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => errorDbManager),
  }));

  const tool = new SqlQueryTool();

  const parameters = {
    query: "SELECT nonexistent_column FROM users",
    explanation: "Query nonexistent column",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "Column not found. Use get_schema_info to see available columns.",
  );
  expect(result.action).toBe("sql_error");

  // Restore original mock
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => originalDbManager),
  }));
});

test("SqlQueryTool should handle SQL syntax errors", async () => {
  // Create a separate mock for this test
  const errorDbManager = {
    connect: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
    db: {
      prepare: mock(() => {
        throw new Error("syntax error near 'INVALID'");
      }),
    },
  };

  // Mock the DatabaseManager constructor for this test
  const originalDbManager = mockDatabaseManager;
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => errorDbManager),
  }));

  const tool = new SqlQueryTool();

  const parameters = {
    query: "SELECT * FROM users WHERE INVALID",
    explanation: "Query with syntax error",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(false);
  expect(result.error).toContain("SQL syntax error");
  expect(result.action).toBe("sql_error");

  // Restore original mock
  mock.module("../../../../lib/database.js", () => ({
    DatabaseManager: mock(() => originalDbManager),
  }));
});

test("SqlQueryTool should respect pageSize parameter", async () => {
  const tool = createTool();
  const parameters = {
    query: "SELECT * FROM users",
    explanation: "Get all users",
    pageSize: 25,
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  await tool.execute(parameters, context);

  // Check that the query was called with LIMIT 25
  const calls = mockDatabaseManager.db.prepare.mock.calls;
  const paginatedCall = calls.find((call) => call[0].includes("LIMIT 25"));
  expect(paginatedCall).toBeDefined();
});

test("SqlQueryTool should format results for AI consumption", async () => {
  const tool = createTool();
  const parameters = {
    query: "SELECT id, name FROM users",
    explanation: "Get user list",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.data.summary).toBeDefined();
  expect(result.data.summary.query).toBe("SELECT id, name FROM users");
  expect(result.data.summary.explanation).toBe("Get user list");
  expect(result.data.summary.totalRows).toBe(10);
  expect(result.data.summary.returnedRows).toBe(2);
  expect(result.data.summary.columns).toBe(3); // id, name, email from mock
  expect(result.data.summary.columnNames).toEqual(["id", "name", "email"]);

  expect(result.data.textSummary).toContain("Query executed successfully");
  expect(result.data.textSummary).toContain("Found 10 total rows");
  expect(result.data.textSummary).toContain("Columns: id, name, email");

  expect(result.data.results.columns).toEqual(["id", "name", "email"]);
  expect(result.data.results.rows).toHaveLength(2);
});

test("SqlQueryTool should handle empty result sets", async () => {
  const tool = createTool();
  mockDatabaseManager.db.prepare.mockImplementation((query) => ({
    get: mock(() => ({ total: 0 })),
    all: mock(() => []),
  }));

  const parameters = {
    query: "SELECT * FROM users WHERE 1=0",
    explanation: "Get no users",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(true);
  expect(result.data.summary.totalRows).toBe(0);
  expect(result.data.summary.returnedRows).toBe(0);
  expect(result.data.textSummary).toContain("No data returned");
});

test("SqlQueryTool should handle queries with existing LIMIT clause", async () => {
  const tool = createTool();
  mockDatabaseManager.db.prepare.mockImplementation((query) => ({
    all: mock(() => [{ id: 1, name: "John" }]),
  }));

  const parameters = {
    query: "SELECT * FROM users ORDER BY id DESC LIMIT 1",
    explanation: "Get the newest user",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(true);
  expect(result.data.summary.totalRows).toBe(1);
  expect(result.data.summary.returnedRows).toBe(1);

  // Verify the query was executed as-is without adding extra LIMIT
  const calls = mockDatabaseManager.db.prepare.mock.calls;
  const queryCall = calls.find(
    (call) => call[0] === "SELECT * FROM users ORDER BY id DESC LIMIT 1",
  );
  expect(queryCall).toBeDefined();
});

test("SqlQueryTool should handle queries with existing OFFSET clause", async () => {
  const tool = createTool();
  mockDatabaseManager.db.prepare.mockImplementation((query) => ({
    all: mock(() => [{ id: 2, name: "Jane" }]),
  }));

  const parameters = {
    query: "SELECT * FROM users ORDER BY id LIMIT 1 OFFSET 1",
    explanation: "Get the second user",
  };
  const context = { databasePath: "/path/to/db.sqlite" };

  const result = await tool.execute(parameters, context);

  expect(result.success).toBe(true);
  expect(result.data.summary.totalRows).toBe(1);
  expect(result.data.summary.returnedRows).toBe(1);

  // Verify the query was executed as-is without adding extra LIMIT/OFFSET
  const calls = mockDatabaseManager.db.prepare.mock.calls;
  const queryCall = calls.find(
    (call) => call[0] === "SELECT * FROM users ORDER BY id LIMIT 1 OFFSET 1",
  );
  expect(queryCall).toBeDefined();
});
