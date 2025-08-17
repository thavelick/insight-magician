import { afterEach, beforeEach, expect, test } from "bun:test";
import { ListWidgetsTool } from "../../lib/tools/list-widgets-tool.js";

const mockSessionStorage = {
  getItem: (key) => mockSessionStorage.data[key] || null,
  setItem: (key, value) => {
    mockSessionStorage.data[key] = value;
  },
  removeItem: (key) => {
    delete mockSessionStorage.data[key];
  },
  clear: () => {
    mockSessionStorage.data = {};
  },
  data: {},
};
beforeEach(() => {
  global.sessionStorage = mockSessionStorage;
  mockSessionStorage.clear();
});

afterEach(() => {
  mockSessionStorage.clear();
});

test("ListWidgetsTool - constructor sets correct properties", () => {
  const tool = new ListWidgetsTool();

  expect(tool.name).toBe("list_widgets");
  expect(tool.description).toBe(
    "Get information about current widgets on dashboard",
  );
});

test("ListWidgetsTool - getDefinition returns correct tool definition", () => {
  const tool = new ListWidgetsTool();
  const definition = tool.getDefinition();

  expect(definition.type).toBe("function");
  expect(definition.function.name).toBe("list_widgets");
  expect(definition.function.description).toContain(
    "Get information about current widgets",
  );
  expect(definition.function.parameters.type).toBe("object");
  expect(definition.function.parameters.required).toEqual([]);
});

test("ListWidgetsTool - validateParameters always returns valid", () => {
  const tool = new ListWidgetsTool();

  expect(tool.validateParameters({})).toEqual({ valid: true });
  expect(tool.validateParameters({ someParam: "value" })).toEqual({
    valid: true,
  });
});

test("ListWidgetsTool - execute with no widgets returns empty dashboard", async () => {
  const tool = new ListWidgetsTool();

  const result = await tool.execute({}, {});

  expect(result.success).toBe(true);
  expect(result.action).toBe("widgets_listed");
  expect(result.data.widgets).toEqual([]);
  expect(result.data.totalWidgets).toBe(0);
  expect(result.data.message).toBe("No widgets currently on dashboard");
});

test("ListWidgetsTool - execute with sample widgets returns formatted data", async () => {
  const tool = new ListWidgetsTool();

  const mockWidgets = [
    {
      id: 1,
      title: "Sales Chart",
      widgetType: "graph",
      query: "SELECT * FROM sales",
      width: 2,
      height: 2,
      results: { rows: [["data1"], ["data2"]] },
      isFlipped: false,
    },
    {
      id: 2,
      title: "",
      widgetType: "data-table",
      query: "",
      width: 1,
      height: 1,
      results: null,
      isFlipped: true,
    },
  ];

  sessionStorage.setItem("widgets", JSON.stringify(mockWidgets));

  const result = await tool.execute({}, {});

  expect(result.success).toBe(true);
  expect(result.action).toBe("widgets_listed");
  expect(result.data.totalWidgets).toBe(2);
  expect(result.data.widgets).toHaveLength(2);

  const widget1 = result.data.widgets[0];
  expect(widget1.id).toBe(1);
  expect(widget1.title).toBe("Sales Chart");
  expect(widget1.type).toBe("graph");
  expect(widget1.query).toBe("SELECT * FROM sales");
  expect(widget1.dimensions).toEqual({ width: 2, height: 2 });
  expect(widget1.hasResults).toBe(true);
  expect(widget1.resultCount).toBe(2);
  expect(widget1.isInEditMode).toBe(false);
  expect(widget1.status).toBe("showing data");

  const widget2 = result.data.widgets[1];
  expect(widget2.id).toBe(2);
  expect(widget2.title).toBe("Widget 2"); // Default title
  expect(widget2.type).toBe("data-table");
  expect(widget2.query).toBe("");
  expect(widget2.dimensions).toEqual({ width: 1, height: 1 });
  expect(widget2.hasResults).toBe(false);
  expect(widget2.resultCount).toBe(0);
  expect(widget2.isInEditMode).toBe(true);
  expect(widget2.status).toBe("empty (no query set)");
});

test("ListWidgetsTool - getWidgetStatus returns correct status", () => {
  const tool = new ListWidgetsTool();

  expect(tool.getWidgetStatus({ query: "" })).toBe("empty (no query set)");
  expect(tool.getWidgetStatus({ query: null })).toBe("empty (no query set)");
  expect(tool.getWidgetStatus({})).toBe("empty (no query set)");

  expect(
    tool.getWidgetStatus({
      query: "SELECT * FROM table",
      results: null,
    }),
  ).toBe("configured but not run");

  expect(
    tool.getWidgetStatus({
      query: "SELECT * FROM table",
      results: { rows: [] },
    }),
  ).toBe("no results (query returned empty)");

  expect(
    tool.getWidgetStatus({
      query: "SELECT * FROM table",
      results: { rows: [["data"]] },
    }),
  ).toBe("showing data");
});

test("ListWidgetsTool - generateWidgetSummary creates correct summaries", () => {
  const tool = new ListWidgetsTool();

  expect(tool.generateWidgetSummary([])).toBe(
    "Dashboard is empty - no widgets created yet",
  );

  const singleWidget = [
    { type: "data-table", hasResults: true, query: "SELECT * FROM test" },
  ];
  expect(tool.generateWidgetSummary(singleWidget)).toBe(
    "Dashboard has 1 widget: 1 data-table. 1 showing data, 0 need queries.",
  );

  const multipleWidgets = [
    { type: "data-table", hasResults: true, query: "SELECT * FROM test" },
    { type: "graph", hasResults: false, query: "SELECT * FROM sales" },
    { type: "data-table", hasResults: false, query: "" },
    { type: "graph", hasResults: true, query: "SELECT * FROM products" },
  ];
  expect(tool.generateWidgetSummary(multipleWidgets)).toBe(
    "Dashboard has 4 widgets: 2 data-tables, 2 graphs. 2 showing data, 1 need queries.",
  );
});

test("ListWidgetsTool - getWidgetDataFromStorage handles invalid JSON", () => {
  const tool = new ListWidgetsTool();

  sessionStorage.setItem("widgets", "invalid json");
  expect(tool.getWidgetDataFromStorage()).toEqual([]);

  sessionStorage.removeItem("widgets");
  expect(tool.getWidgetDataFromStorage()).toEqual([]);

  sessionStorage.setItem("widgets", JSON.stringify([{ id: 1 }]));
  expect(tool.getWidgetDataFromStorage()).toEqual([{ id: 1 }]);
});

test("ListWidgetsTool - execute handles storage errors gracefully", async () => {
  const tool = new ListWidgetsTool();

  const originalGetItem = sessionStorage.getItem;
  sessionStorage.getItem = () => {
    throw new Error("Storage error");
  };

  const result = await tool.execute({}, {});

  expect(result.success).toBe(true);
  expect(result.action).toBe("widgets_listed");
  expect(result.data.widgets).toEqual([]);
  expect(result.data.totalWidgets).toBe(0);

  sessionStorage.getItem = originalGetItem;
});

test("ListWidgetsTool - handles widgets with missing properties gracefully", async () => {
  const tool = new ListWidgetsTool();

  sessionStorage.clear();

  const mockWidgets = [
    { id: 1 },
    {
      id: 2,
      title: "Complete Widget",
      widgetType: "graph",
      query: "SELECT * FROM test",
      width: 3,
      height: 4,
      results: { rows: [["data"]] },
      isFlipped: false,
    },
  ];

  sessionStorage.setItem("widgets", JSON.stringify(mockWidgets));

  const result = await tool.execute({}, {});

  expect(result.success).toBe(true);
  expect(result.data.widgets).toHaveLength(2);

  const widget1 = result.data.widgets[0];
  expect(widget1.id).toBe(1);
  expect(widget1.title).toBe("Widget 1");
  expect(widget1.type).toBe("data-table");
  expect(widget1.query).toBe("");
  expect(widget1.dimensions).toEqual({ width: 2, height: 2 });
  expect(widget1.hasResults).toBe(false);
  expect(widget1.resultCount).toBe(0);
  expect(widget1.isInEditMode).toBe(false);
});
