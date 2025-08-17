import { expect, mock, test } from "bun:test";
import { WidgetCreationTool } from "../../../../lib/tools/widget-creation-tool.js";

const mockDatabaseManager = {
  connect: mock(() => Promise.resolve()),
  disconnect: mock(() => Promise.resolve()),
  db: {
    prepare: mock((query) => ({
      all: mock(() => [
        { category: "Electronics", total: 15000 },
        { category: "Books", total: 8500 },
        { category: "Clothing", total: 12000 },
      ]),
    })),
  },
};

const mockValidateSqlForWidget = mock((query) => ({ isValid: true }));

mock.module("../../../../lib/database.js", () => ({
  DatabaseManager: mock(() => mockDatabaseManager),
}));

mock.module("../../../../lib/sqlValidator.js", () => ({
  validateSqlForWidget: mockValidateSqlForWidget,
}));

function createTool() {
  if (mockDatabaseManager.db?.prepare) {
    mockDatabaseManager.db.prepare.mockClear();
  }
  mockValidateSqlForWidget.mockClear();
  return new WidgetCreationTool();
}

test("WidgetCreationTool - basic properties", () => {
  const tool = createTool();
  expect(tool.name).toBe("create_widget");
  expect(tool.description).toBe(
    "Create new chart or table widgets on the dashboard",
  );
});

test("WidgetCreationTool - getDefinition returns correct structure", () => {
  const tool = createTool();
  const definition = tool.getDefinition();

  expect(definition.type).toBe("function");
  expect(definition.function.name).toBe("create_widget");
  expect(definition.function.description).toContain(
    "Create a new data visualization widget",
  );
  expect(definition.function.parameters.type).toBe("object");
  expect(definition.function.parameters.required).toEqual([
    "title",
    "widgetType",
    "query",
  ]);

  const props = definition.function.parameters.properties;
  expect(props.title.type).toBe("string");
  expect(props.widgetType.enum).toEqual(["data-table", "graph"]);
  expect(props.query.type).toBe("string");
  expect(props.width.minimum).toBe(1);
  expect(props.width.maximum).toBe(4);
  expect(props.height.minimum).toBe(1);
  expect(props.height.maximum).toBe(4);
});

test("WidgetCreationTool - prompt methods", () => {
  const tool = createTool();

  expect(tool.getPromptDescription()).toBe(
    "Create new chart or table widgets on the dashboard",
  );
  expect(tool.getUsageGuidance()).toContain(
    "Use create_widget when users want to visualize data",
  );

  const examples = tool.getExampleQueries();
  expect(examples).toBeInstanceOf(Array);
  expect(examples.length).toBeGreaterThan(0);
  expect(examples[0]).toContain("Create a bar chart");
});

test("WidgetCreationTool - tool use examples", () => {
  const tool = createTool();
  const examples = tool.getToolUseExamples();
  expect(examples).toBeString();
  expect(examples).toContain("Chart Function Examples");
  expect(examples).toContain("Pie Chart");
  expect(examples).toContain("Bar Chart");
  expect(examples).toContain("createChart(data, svg, d3, width, height)");
});

test("WidgetCreationTool - successful data table creation", async () => {
  const tool = createTool();
  const args = {
    title: "Customer List",
    widgetType: "data-table",
    query: "SELECT name, email FROM customers",
    width: 3,
    height: 2,
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_created");
  expect(result.widgetConfig.title).toBe("Customer List");
  expect(result.widgetConfig.widgetType).toBe("data-table");
  expect(result.widgetConfig.query).toBe("SELECT name, email FROM customers");
  expect(result.widgetConfig.width).toBe(3);
  expect(result.widgetConfig.height).toBe(2);
  expect(result.widgetConfig.id).toMatch(/^widget_\d+_\d+$/);
  expect(result.widgetConfig.results).toBeDefined();
  expect(result.message).toContain("Successfully created data-table widget");

  expect(mockDatabaseManager.db.prepare).toHaveBeenCalledWith(
    "SELECT name, email FROM customers",
  );

  expect(mockValidateSqlForWidget).toHaveBeenCalledWith(
    "SELECT name, email FROM customers",
  );
});

test("WidgetCreationTool - successful graph widget creation", async () => {
  const tool = createTool();
  const chartFunction = `function createChart(data, svg, d3, width, height) {
    return svg;
  }`;

  const args = {
    title: "Sales by Category",
    widgetType: "graph",
    query: "SELECT category, SUM(amount) as total FROM sales GROUP BY category",
    width: 2,
    height: 2,
    chartFunction,
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_created");
  expect(result.widgetConfig.title).toBe("Sales by Category");
  expect(result.widgetConfig.widgetType).toBe("graph");
  expect(result.widgetConfig.chartFunction).toContain("createChart");
  expect(result.message).toContain("Successfully created graph widget");
});

test("WidgetCreationTool - missing required parameters", async () => {
  const tool = createTool();

  let result = await tool.execute({
    widgetType: "data-table",
    query: "SELECT * FROM users",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Missing required parameters");

  result = await tool.execute({
    title: "My Widget",
    query: "SELECT * FROM users",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Missing required parameters");

  result = await tool.execute({
    title: "My Widget",
    widgetType: "data-table",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Missing required parameters");
});

test("WidgetCreationTool - invalid widget type", async () => {
  const tool = createTool();
  const args = {
    title: "My Widget",
    widgetType: "invalid-type",
    query: "SELECT * FROM users",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid widgetType");
});

test("WidgetCreationTool - invalid dimensions", async () => {
  const tool = createTool();

  let result = await tool.execute({
    title: "My Widget",
    widgetType: "data-table",
    query: "SELECT * FROM users",
    width: 5,
    height: 2,
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Width and height must be between 1 and 4");

  result = await tool.execute({
    title: "My Widget",
    widgetType: "data-table",
    query: "SELECT * FROM users",
    width: 2,
    height: 0,
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Width and height must be between 1 and 4");
});

test("WidgetCreationTool - graph widget without chart function", async () => {
  const tool = createTool();
  const args = {
    title: "My Chart",
    widgetType: "graph",
    query: "SELECT category, count FROM sales",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(false);
  expect(result.error).toContain("chartFunction is required for graph widgets");
});

test("WidgetCreationTool - invalid chart function", async () => {
  const tool = createTool();
  const args = {
    title: "My Chart",
    widgetType: "graph",
    query: "SELECT category, count FROM sales",
    chartFunction: "not a valid function",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(false);
  expect(result.error).toContain(
    "chartFunction must be a JavaScript function named 'createChart'",
  );
});

test("WidgetCreationTool - SQL validation failure", async () => {
  const tool = createTool();

  mockValidateSqlForWidget.mockReturnValueOnce({
    isValid: false,
    error: "Invalid SQL syntax",
  });

  const args = {
    title: "My Widget",
    widgetType: "data-table",
    query: "INVALID SQL QUERY",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid SQL query: Invalid SQL syntax");
});

test("WidgetCreationTool - database query failure", async () => {
  const tool = createTool();

  mockDatabaseManager.db.prepare.mockImplementationOnce(() => {
    throw new Error("Database connection failed");
  });

  const args = {
    title: "My Widget",
    widgetType: "data-table",
    query: "SELECT * FROM users",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(false);
  expect(result.error).toContain(
    "Query execution failed: Database connection failed",
  );
});

test("WidgetCreationTool - default width and height", async () => {
  const tool = createTool();
  const args = {
    title: "Default Size Widget",
    widgetType: "data-table",
    query: "SELECT * FROM users",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.width).toBe(2);
  expect(result.widgetConfig.height).toBe(2);
});

test("WidgetCreationTool - trims whitespace from inputs", async () => {
  const tool = createTool();
  const args = {
    title: "  My Widget  ",
    widgetType: "data-table",
    query: "  SELECT * FROM users  ",
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.title).toBe("My Widget");
  expect(result.widgetConfig.query).toBe("SELECT * FROM users");
});

test("WidgetCreationTool - chart function trimming", async () => {
  const tool = createTool();
  const chartFunction = `  
    function createChart(data, svg, d3, width, height) {
      return svg;
    }
  `;

  const args = {
    title: "Chart Widget",
    widgetType: "graph",
    query: "SELECT * FROM data",
    chartFunction,
  };

  const result = await tool.execute(args, { databasePath: "test.db" });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.chartFunction).toBe(chartFunction.trim());
});
