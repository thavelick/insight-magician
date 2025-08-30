import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { AppDatabase } from "../../../lib/app-database.js";

// Test database path - separate from real app.db
const TEST_DB_PATH = "./test-app.db";

let appDb;

beforeEach(async () => {
  // Clean up any existing test database
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // File doesn't exist, that's fine
  }

  // Create fresh database for each test
  appDb = new AppDatabase(TEST_DB_PATH);
  await appDb.initialize();
});

afterEach(async () => {
  // Clean up after each test
  if (appDb) {
    await appDb.disconnect();
  }

  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // File doesn't exist, that's fine
  }
});

test("AppDatabase: should initialize database and create tables", async () => {
  expect(appDb.db).toBeTruthy();

  // Check that users table exists
  const result = appDb.db
    .prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
  `)
    .get();

  expect(result).toBeTruthy();
  expect(result.name).toBe("users");
});

test("AppDatabase: should initialize repository interfaces", async () => {
  // Check that all repository interfaces are available
  expect(appDb.users).toBeTruthy();
  expect(appDb.sessions).toBeTruthy();
  expect(appDb.authTokens).toBeTruthy();

  // Check that repository methods exist
  expect(typeof appDb.users.create).toBe("function");
  expect(typeof appDb.users.getByEmail).toBe("function");
  expect(typeof appDb.sessions.create).toBe("function");
  expect(typeof appDb.authTokens.create).toBe("function");
});

test("AppDatabase: should pass health check", async () => {
  const isHealthy = await appDb.healthCheck();
  expect(isHealthy).toBe(true);
});

test("AppDatabase: should detect when database needs initialization", async () => {
  // Create fresh database without initialization
  const freshDb = new AppDatabase("./fresh-test.db");
  freshDb.db = new (await import("bun:sqlite")).Database("./fresh-test.db");

  try {
    const needsInit = await freshDb.needsInitialization();
    expect(needsInit).toBe(true);
  } finally {
    await freshDb.disconnect();
    try {
      unlinkSync("./fresh-test.db");
    } catch {
      // Ignore cleanup errors
    }
  }
});

test("AppDatabase: should detect when database is already initialized", async () => {
  const needsInit = await appDb.needsInitialization();
  expect(needsInit).toBe(false);
});

test("AppDatabase: should handle disconnect gracefully when no connection", async () => {
  const disconnectedDb = new AppDatabase("./disconnected-test.db");

  // Should not throw error when disconnecting without connection
  await expect(disconnectedDb.disconnect()).resolves.toBeUndefined();
});
