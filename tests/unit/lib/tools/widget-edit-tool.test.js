import { expect, mock, test } from "bun:test";
import { WidgetEditTool } from "../../../../lib/tools/widget-edit-tool.js";

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
  return new WidgetEditTool();
}

const mockWidgets = [
  {
    id: 1,
    title: "Existing Widget",
    type: "data-table",
    query: "SELECT * FROM users",
    dimensions: { width: 2, height: 2 },
    hasResults: true,
    resultCount: 10,
  },
  {
    id: 2,
    title: "Chart Widget",
    type: "graph",
    query: "SELECT category, count FROM sales",
    dimensions: { width: 3, height: 2 },
    chartFunction: "function createChart() { return svg; }",
    hasResults: true,
    resultCount: 5,
  },
];

test("WidgetEditTool - basic properties", () => {
  const tool = createTool();
  expect(tool.name).toBe("edit_widget");
  expect(tool.description).toBe("Modify properties of existing widgets");
});

test("WidgetEditTool - getDefinition returns correct structure", () => {
  const tool = createTool();
  const definition = tool.getDefinition();

  expect(definition.type).toBe("function");
  expect(definition.function.name).toBe("edit_widget");
  expect(definition.function.description).toContain(
    "Modify an existing widget's properties",
  );
  expect(definition.function.parameters.type).toBe("object");
  expect(definition.function.parameters.required).toEqual(["widgetId"]);

  const props = definition.function.parameters.properties;
  expect(props.widgetId.type).toBe("integer");
  expect(props.title.type).toBe("string");
  expect(props.query.type).toBe("string");
  expect(props.widgetType.enum).toEqual(["data-table", "graph"]);
  expect(props.chartFunction.type).toBe("string");
});

test("WidgetEditTool - prompt methods", () => {
  const tool = createTool();

  expect(tool.getPromptDescription()).toBe(
    "Modify properties of existing widgets",
  );
  expect(tool.getUsageGuidance()).toContain(
    "Use edit_widget when users want to update",
  );

  const examples = tool.getExampleQueries();
  expect(examples).toBeInstanceOf(Array);
  expect(examples.length).toBeGreaterThan(0);
  expect(examples[0]).toContain("Change the title");
});

test("WidgetEditTool - successful title update", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    title: "Updated Title",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_updated");
  expect(result.widgetConfig.id).toBe(1);
  expect(result.widgetConfig.title).toBe("Updated Title");
  expect(result.widgetConfig.query).toBe("SELECT * FROM users"); // unchanged
  expect(result.message).toContain("Successfully updated widget 1");
});

test("WidgetEditTool - successful query update", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    query: "SELECT name, email FROM customers",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_updated");
  expect(result.widgetConfig.id).toBe(1);
  expect(result.widgetConfig.query).toBe("SELECT name, email FROM customers");
  expect(result.widgetConfig.title).toBe("Existing Widget"); // unchanged
  expect(result.widgetConfig.results).toBeDefined();
  expect(result.message).toContain("query");

  expect(mockDatabaseManager.db.prepare).toHaveBeenCalledWith(
    "SELECT name, email FROM customers",
  );
  expect(mockValidateSqlForWidget).toHaveBeenCalledWith(
    "SELECT name, email FROM customers",
  );
});

test("WidgetEditTool - successful widget type conversion", async () => {
  const tool = createTool();
  const chartFunction = `function createChart(data, svg, d3, width, height) {
    return svg;
  }`;

  const args = {
    widgetId: 1,
    widgetType: "graph",
    chartFunction,
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_updated");
  expect(result.widgetConfig.widgetType).toBe("graph");
  expect(result.widgetConfig.chartFunction).toContain("createChart");
  expect(result.widgetConfig.results).toBeDefined(); // query re-executed
});

test("WidgetEditTool - multiple property updates", async () => {
  const tool = createTool();
  const args = {
    widgetId: 2,
    title: "New Chart Title",
    query: "SELECT category, SUM(amount) as total FROM sales GROUP BY category",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.title).toBe("New Chart Title");
  expect(result.widgetConfig.query).toBe(
    "SELECT category, SUM(amount) as total FROM sales GROUP BY category",
  );
  expect(result.message).toContain("title, query");
});

test("WidgetEditTool - missing widgetId", async () => {
  const tool = createTool();

  let result = await tool.execute({}, { widgets: mockWidgets });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Missing required parameter: widgetId");

  result = await tool.execute({ widgetId: null }, { widgets: mockWidgets });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Missing required parameter: widgetId");
});

test("WidgetEditTool - invalid widgetId", async () => {
  const tool = createTool();

  let result = await tool.execute(
    { widgetId: "not-a-number" },
    { widgets: mockWidgets },
  );
  expect(result.success).toBe(false);
  expect(result.error).toContain("widgetId must be a positive integer");

  result = await tool.execute({ widgetId: 0 }, { widgets: mockWidgets });
  expect(result.success).toBe(false);
  expect(result.error).toContain("widgetId must be a positive integer");

  result = await tool.execute({ widgetId: -1 }, { widgets: mockWidgets });
  expect(result.success).toBe(false);
  expect(result.error).toContain("widgetId must be a positive integer");
});

test("WidgetEditTool - widget not found", async () => {
  const tool = createTool();
  const args = {
    widgetId: 999,
    title: "New Title",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain("Widget with ID 999 not found");
});

test("WidgetEditTool - invalid widget type", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    widgetType: "invalid-type",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid widgetType");
});

test("WidgetEditTool - graph widget requires chart function", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1, // data-table widget
    widgetType: "graph", // converting to graph
    // missing chartFunction
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain("chartFunction is required");
});

test("WidgetEditTool - invalid chart function", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    widgetType: "graph",
    chartFunction: "not a valid function",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain(
    "chartFunction must be a JavaScript function named 'createChart'",
  );
});

test("WidgetEditTool - SQL validation failure", async () => {
  const tool = createTool();

  mockValidateSqlForWidget.mockReturnValueOnce({
    isValid: false,
    error: "Invalid SQL syntax",
  });

  const args = {
    widgetId: 1,
    query: "INVALID SQL QUERY",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid SQL query: Invalid SQL syntax");
});

test("WidgetEditTool - database query failure", async () => {
  const tool = createTool();

  mockDatabaseManager.db.prepare.mockImplementationOnce(() => {
    throw new Error("Database connection failed");
  });

  const args = {
    widgetId: 1,
    query: "SELECT * FROM customers",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain(
    "Query execution failed: Database connection failed",
  );
});

test("WidgetEditTool - no database path", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    query: "SELECT * FROM users",
  };

  const result = await tool.execute(args, {
    widgets: mockWidgets,
    // databasePath missing
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain("No database connection available");
});

test("WidgetEditTool - trims whitespace from inputs", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    title: "  Updated Title  ",
    query: "  SELECT * FROM customers  ",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.title).toBe("Updated Title");
  expect(result.widgetConfig.query).toBe("SELECT * FROM customers");
});

test("WidgetEditTool - preserves existing chart function for graph widgets", async () => {
  const tool = createTool();
  const args = {
    widgetId: 2, // graph widget with existing chart function
    title: "Updated Chart Title",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.chartFunction).toBe(
    "function createChart() { return svg; }",
  );
});

test("WidgetEditTool - only title update doesn't re-execute query", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    title: "New Title Only",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.results).toBeUndefined(); // no new results
  expect(mockDatabaseManager.db.prepare).not.toHaveBeenCalled();
});

test("WidgetEditTool - successful width and height update", async () => {
  const tool = createTool();
  const args = {
    widgetId: 1,
    width: 3,
    height: 4,
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe("widget_updated");
  expect(result.widgetConfig.width).toBe(3);
  expect(result.widgetConfig.height).toBe(4);
  expect(result.message).toContain("width, height");
});

test("WidgetEditTool - invalid width and height values", async () => {
  const tool = createTool();

  let result = await tool.execute(
    { widgetId: 1, width: 0 },
    { widgets: mockWidgets },
  );
  expect(result.success).toBe(false);
  expect(result.error).toContain("Width must be between 1 and 4");

  result = await tool.execute(
    { widgetId: 1, width: 5 },
    { widgets: mockWidgets },
  );
  expect(result.success).toBe(false);
  expect(result.error).toContain("Width must be between 1 and 4");

  result = await tool.execute(
    { widgetId: 1, height: 0 },
    { widgets: mockWidgets },
  );
  expect(result.success).toBe(false);
  expect(result.error).toContain("Height must be between 1 and 4");

  result = await tool.execute(
    { widgetId: 1, height: 5 },
    { widgets: mockWidgets },
  );
  expect(result.success).toBe(false);
  expect(result.error).toContain("Height must be between 1 and 4");
});

test("WidgetEditTool - preserve existing dimensions when not specified", async () => {
  const tool = createTool();
  const args = {
    widgetId: 2, // widget with dimensions 3x2
    title: "New Title",
  };

  const result = await tool.execute(args, {
    databasePath: "test.db",
    widgets: mockWidgets,
  });

  expect(result.success).toBe(true);
  expect(result.widgetConfig.width).toBe(3); // preserved
  expect(result.widgetConfig.height).toBe(2); // preserved
});
