import { expect, test } from "bun:test";
import {
  isSelectQuery,
  validateSql,
  validateSqlForTool,
  validateSqlForWidget,
  validateSqlOrThrow,
} from "../../lib/sqlValidator.js";

test("validateSql should validate basic query", () => {
  const result = validateSql("SELECT * FROM users");
  expect(result.isValid).toBe(true);
});

test("validateSql should reject empty query", () => {
  const result = validateSql("");
  expect(result.isValid).toBe(false);
  expect(result.error).toContain("Query must be a non-empty string");
});

test("validateSql should reject whitespace-only query", () => {
  const result = validateSql("   ");
  expect(result.isValid).toBe(false);
  expect(result.error).toContain("Query cannot be empty");
});

test("validateSql should reject non-string query", () => {
  const result = validateSql(123);
  expect(result.isValid).toBe(false);
  expect(result.error).toContain("Query must be a non-empty string");
});

test("validateSql should reject queries with semicolons", () => {
  const result = validateSql("SELECT * FROM users; DROP TABLE users;");
  expect(result.isValid).toBe(false);
  expect(result.error).toContain("Semicolons are not allowed");
});

test("validateSql should reject dangerous operations", () => {
  const dangerousQueries = [
    "DROP TABLE users",
    "DELETE FROM users",
    "UPDATE users SET name = 'hacked'",
    "INSERT INTO users VALUES (1, 'hacker')",
    "ALTER TABLE users ADD COLUMN evil TEXT",
    "CREATE TABLE evil AS SELECT * FROM users",
    "TRUNCATE TABLE users",
    "REPLACE INTO users VALUES (1, 'replaced')",
    "PRAGMA table_info(users)",
  ];

  for (const query of dangerousQueries) {
    const result = validateSql(query);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("operations are not allowed");
  }
});

test("validateSqlForWidget should reject LIMIT/OFFSET by default", () => {
  const result = validateSqlForWidget("SELECT * FROM users LIMIT 10");
  expect(result.isValid).toBe(false);
  expect(result.error).toContain("LIMIT clauses are not allowed");

  const result2 = validateSqlForWidget("SELECT * FROM users OFFSET 20");
  expect(result2.isValid).toBe(false);
  expect(result2.error).toContain("OFFSET clauses are not allowed");
});

test("validateSqlForTool should allow LIMIT/OFFSET", () => {
  const result = validateSqlForTool("SELECT * FROM users LIMIT 10");
  expect(result.isValid).toBe(true);

  const result2 = validateSqlForTool("SELECT * FROM users OFFSET 20");
  expect(result2.isValid).toBe(true);

  const result3 = validateSqlForTool("SELECT * FROM users LIMIT 10 OFFSET 20");
  expect(result3.isValid).toBe(true);
});

test("validateSql with allowLimitOffset option should work correctly", () => {
  // Default behavior (no LIMIT/OFFSET)
  let result = validateSql("SELECT * FROM users LIMIT 10");
  expect(result.isValid).toBe(false);

  // Explicitly allow LIMIT/OFFSET
  result = validateSql("SELECT * FROM users LIMIT 10", {
    allowLimitOffset: true,
  });
  expect(result.isValid).toBe(true);

  // Explicitly forbid LIMIT/OFFSET
  result = validateSql("SELECT * FROM users LIMIT 10", {
    allowLimitOffset: false,
  });
  expect(result.isValid).toBe(false);
});

test("validateSqlOrThrow should throw on invalid queries", () => {
  expect(() => {
    validateSqlOrThrow("DROP TABLE users");
  }).toThrow("operations are not allowed");

  expect(() => {
    validateSqlOrThrow("SELECT * FROM users LIMIT 10", {
      allowLimitOffset: false,
    });
  }).toThrow("LIMIT clauses are not allowed");
});

test("validateSqlOrThrow should not throw on valid queries", () => {
  expect(() => {
    validateSqlOrThrow("SELECT * FROM users");
  }).not.toThrow();

  expect(() => {
    validateSqlOrThrow("SELECT * FROM users LIMIT 10", {
      allowLimitOffset: true,
    });
  }).not.toThrow();
});

test("isSelectQuery should correctly identify SELECT queries", () => {
  expect(isSelectQuery("SELECT * FROM users")).toBe(true);
  expect(isSelectQuery("select * from users")).toBe(true);
  expect(isSelectQuery("  SELECT * FROM users  ")).toBe(true);

  expect(isSelectQuery("DROP TABLE users")).toBe(false);
  expect(isSelectQuery("UPDATE users SET name = 'test'")).toBe(false);
  expect(isSelectQuery("")).toBe(false);
  expect(isSelectQuery(null)).toBe(false);
  expect(isSelectQuery(undefined)).toBe(false);
});

test("LIMIT/OFFSET detection should handle edge cases", () => {
  // Should not trigger false positives
  expect(validateSqlForWidget("SELECT unlimited FROM users").isValid).toBe(
    true,
  );
  expect(validateSqlForWidget("SELECT * FROM offset_table").isValid).toBe(true);
  expect(
    validateSqlForWidget("SELECT * FROM users WHERE name = 'limit'").isValid,
  ).toBe(true);

  // Should detect actual LIMIT/OFFSET clauses
  expect(validateSqlForWidget("SELECT * FROM users LIMIT 10").isValid).toBe(
    false,
  );
  expect(validateSqlForWidget("SELECT * FROM users OFFSET 5").isValid).toBe(
    false,
  );
  expect(
    validateSqlForWidget("SELECT * FROM users ORDER BY id LIMIT 10").isValid,
  ).toBe(false);
});
