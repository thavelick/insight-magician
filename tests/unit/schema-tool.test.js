import { expect, test } from "bun:test";
import { SchemaTool } from "../../lib/tools/schema-tool.js";

test("SchemaTool getDefinition returns correct definition", () => {
  const tool = new SchemaTool();
  const definition = tool.getDefinition();

  expect(definition.type).toBe("function");
  expect(definition.function.name).toBe("get_schema_info");
  expect(definition.function.description).toContain("database table structure");
  expect(definition.function.description).toContain(
    "columns, types, and row counts",
  );
  expect(definition.function.parameters.type).toBe("object");
  expect(definition.function.parameters.required).toEqual([]);
});

test("SchemaTool execute handles non-existent database file", async () => {
  const tool = new SchemaTool();

  const context = { databasePath: "./uploads/nonexistent.db" };
  const result = await tool.execute({}, context);

  expect(result.success).toBe(false);
  expect(result.action).toBe("schema_error");
  expect(result.error).toContain("Failed to read database schema");
});

test("SchemaTool execute handles missing database path", async () => {
  const tool = new SchemaTool();

  const context = {}; // No databasePath
  const result = await tool.execute({}, context);

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "No database file available. Please upload a database first.",
  );
  expect(result.action).toBe("schema_error");
});

test("SchemaTool validate parameters works correctly", () => {
  const tool = new SchemaTool();

  // Valid parameters
  expect(tool.validateParameters({})).toEqual({ valid: true });
  expect(tool.validateParameters({ tableName: "users" })).toEqual({
    valid: true,
  });

  // Invalid parameters
  const invalidResult = tool.validateParameters({ tableName: 123 });
  expect(invalidResult.valid).toBe(false);
  expect(invalidResult.error).toBe("tableName must be a string if provided");
});
