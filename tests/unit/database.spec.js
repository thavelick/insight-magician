import { expect, test } from "bun:test";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { handleSchema } from "../../routes/schema.js";
import {
  cleanupDatabase,
  createDatabaseFromFixture,
  getTempDatabasePath,
} from "../helpers/database.js";

// Helper function to test schema extraction with a given fixture
async function testSchemaExtraction(fixtureName) {
  const testDbPath = getTempDatabasePath(fixtureName);
  const uploadsDir = join(process.cwd(), "uploads");
  const uploadedDbPath = join(
    uploadsDir,
    `test-${fixtureName}-${Date.now()}-${Math.floor(Math.random() * 10000)}.db`,
  );

  try {
    await createDatabaseFromFixture(fixtureName, testDbPath);

    // Ensure uploads directory exists
    mkdirSync(uploadsDir, { recursive: true });
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
