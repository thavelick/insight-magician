import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
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

test("AppDatabase: should create user successfully", async () => {
  const testEmail = "test@example.com";

  const user = await appDb.createUser(testEmail);

  expect(user).toBeTruthy();
  expect(user.id).toBeTruthy();
  expect(user.email).toBe(testEmail);
  expect(user.created_at).toBeTruthy();
});

test("AppDatabase: should prevent duplicate email addresses", async () => {
  const testEmail = "duplicate@example.com";

  // Create first user
  await appDb.createUser(testEmail);

  // Try to create duplicate - should throw error
  await expect(appDb.createUser(testEmail)).rejects.toThrow(
    "User with email duplicate@example.com already exists",
  );
});

test("AppDatabase: should get user by email", async () => {
  const testEmail = "getuser@example.com";

  // Create user first
  const createdUser = await appDb.createUser(testEmail);

  // Get user by email
  const foundUser = await appDb.getUserByEmail(testEmail);

  expect(foundUser).toBeTruthy();
  expect(foundUser.id).toBe(createdUser.id);
  expect(foundUser.email).toBe(testEmail);
});

test("AppDatabase: should return null for non-existent email", async () => {
  const foundUser = await appDb.getUserByEmail("nonexistent@example.com");
  expect(foundUser).toBeNull();
});

test("AppDatabase: should get user by ID", async () => {
  const testEmail = "getuserbyid@example.com";

  // Create user first
  const createdUser = await appDb.createUser(testEmail);

  // Get user by ID
  const foundUser = await appDb.getUserById(createdUser.id);

  expect(foundUser).toBeTruthy();
  expect(foundUser.id).toBe(createdUser.id);
  expect(foundUser.email).toBe(testEmail);
});

test("AppDatabase: should return null for non-existent user ID", async () => {
  const foundUser = await appDb.getUserById(99999);
  expect(foundUser).toBeNull();
});

test("AppDatabase: should update last login", async () => {
  const testEmail = "lastlogin@example.com";

  // Create user first
  const user = await appDb.createUser(testEmail);
  expect(user.last_login_at).toBeUndefined();

  // Update last login
  await appDb.updateLastLogin(user.id);

  // Get user again to check last_login_at was updated
  const updatedUser = await appDb.getUserById(user.id);
  expect(updatedUser.last_login_at).toBeTruthy();
});

test("AppDatabase: should throw error when updating last login for non-existent user", async () => {
  await expect(appDb.updateLastLogin(99999)).rejects.toThrow(
    "User with ID 99999 not found",
  );
});

test("AppDatabase: should create auth token", async () => {
  const testEmail = "token@example.com";
  const testToken = "test-token-123";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  // Create user first
  const user = await appDb.createUser(testEmail);

  // Create auth token
  const token = await appDb.createAuthToken(user.id, testToken, expiresAt);

  expect(token).toBeTruthy();
  expect(token.token).toBe(testToken);
  expect(token.expires_at).toBe(expiresAt);
});

test("AppDatabase: should get auth token with user info", async () => {
  const testEmail = "gettoken@example.com";
  const testToken = "get-token-123";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create user and token
  const user = await appDb.createUser(testEmail);
  await appDb.createAuthToken(user.id, testToken, expiresAt);

  // Get token
  const foundToken = await appDb.getAuthToken(testToken);

  expect(foundToken).toBeTruthy();
  expect(foundToken.token).toBe(testToken);
  expect(foundToken.user_id).toBe(user.id);
  expect(foundToken.email).toBe(testEmail);
  expect(foundToken.used_at).toBeNull();
});

test("AppDatabase: should create session", async () => {
  const testEmail = "session@example.com";
  const sessionId = "session-123";
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days from now

  // Create user first
  const user = await appDb.createUser(testEmail);

  // Create session
  const session = await appDb.createSession(sessionId, user.id, expiresAt);

  expect(session).toBeTruthy();
  expect(session.id).toBe(sessionId);
  expect(session.user_id).toBe(user.id);
  expect(session.expires_at).toBe(expiresAt);
});

test("AppDatabase: should get session with user info", async () => {
  const testEmail = "getsession@example.com";
  const sessionId = "get-session-123";
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Create user and session
  const user = await appDb.createUser(testEmail);
  await appDb.createSession(sessionId, user.id, expiresAt);

  // Get session
  const foundSession = await appDb.getSession(sessionId);

  expect(foundSession).toBeTruthy();
  expect(foundSession.id).toBe(sessionId);
  expect(foundSession.user_id).toBe(user.id);
  expect(foundSession.email).toBe(testEmail);
});

test("AppDatabase: should not return expired sessions", async () => {
  const testEmail = "expired@example.com";
  const sessionId = "expired-session-123";
  const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago (expired)

  // Create user and expired session
  const user = await appDb.createUser(testEmail);
  await appDb.createSession(sessionId, user.id, expiresAt);

  // Try to get expired session
  const foundSession = await appDb.getSession(sessionId);

  expect(foundSession).toBeNull();
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
