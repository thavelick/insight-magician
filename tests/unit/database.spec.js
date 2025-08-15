import { expect, test } from "bun:test";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleQuery } from "../../routes/query.js";
import { handleSchema } from "../../routes/schema.js";
import {
  cleanupDatabase,
  createCorruptedDatabase,
  createDatabaseFromFixture,
  getTempDatabasePath,
} from "../helpers/database.js";

// Helper function to test schema extraction with a given fixture
async function testSchemaExtraction(fixtureName) {
  const testDbPath = getTempDatabasePath(fixtureName);
  const uploadedDbPath = join(
    process.cwd(),
    "uploads",
    `test-${fixtureName}-${Date.now()}-${Math.floor(Math.random() * 10000)}.db`,
  );

  try {
    await createDatabaseFromFixture(fixtureName, testDbPath);
    copyFileSync(testDbPath, uploadedDbPath);
    const filename = uploadedDbPath.split("/").pop();

    const request = new Request(
      `http://localhost:3001/api/schema?filename=${filename}`,
    );
    const response = await handleSchema(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.filename).toBe(filename);

    return body.schema;
  } finally {
    await cleanupDatabase(testDbPath);
    await cleanupDatabase(uploadedDbPath);
  }
}

test("should extract schema correctly from database with tables", async () => {
  const schema = await testSchemaExtraction("basic");

  expect(schema).toBeDefined();
  expect(schema.users).toBeDefined();
  expect(schema.users.columns).toBeDefined();
  expect(schema.users.columns.length).toBe(3); // id, name, email

  const columns = schema.users.columns;
  expect(columns.some((col) => col.name === "id")).toBe(true);
  expect(columns.some((col) => col.name === "name")).toBe(true);
  expect(columns.some((col) => col.name === "email")).toBe(true);
});

test("should handle databases with no tables gracefully", async () => {
  const schema = await testSchemaExtraction("empty");
  expect(schema).toEqual({}); // Empty object for no tables
});

test("should return 404 for missing database files in schema endpoint", async () => {
  const request = new Request(
    "http://localhost:3001/api/schema?filename=nonexistent.db",
  );
  const response = await handleSchema(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.error).toBe("Database file not found");
  expect(body.success).toBeUndefined();
});

test("should return 404 for missing database files in query endpoint", async () => {
  const request = new Request("http://localhost:3001/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "nonexistent.db",
      query: "SELECT * FROM users",
      page: 1,
      pageSize: 50,
    }),
  });
  const response = await handleQuery(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.error).toBe("Database file not found");
  expect(body.success).toBeUndefined();
});

test("should return 500 for corrupted database files in schema endpoint", async () => {
  const corruptedDbPath = join(
    process.cwd(),
    "uploads",
    `test-corrupted-${Date.now()}-${Math.floor(Math.random() * 10000)}.db`,
  );

  try {
    await createCorruptedDatabase(corruptedDbPath);
    const filename = corruptedDbPath.split("/").pop();

    const request = new Request(
      `http://localhost:3001/api/schema?filename=${filename}`,
    );
    const response = await handleSchema(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to read database schema");
    expect(body.success).toBeUndefined();
  } finally {
    await cleanupDatabase(corruptedDbPath);
  }
});
