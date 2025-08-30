import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { AppDatabase } from "../../../../lib/app-database.js";

const TEST_DB_PATH = "./test-sessions.db";

let appDb;

beforeEach(async () => {
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // File doesn't exist, that's fine
  }

  appDb = new AppDatabase(TEST_DB_PATH);
  await appDb.initialize();
});

afterEach(async () => {
  if (appDb) {
    await appDb.disconnect();
  }

  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // File doesn't exist, that's fine
  }
});

test("Sessions: should create session", async () => {
  const testEmail = "session@example.com";
  const sessionId = "session-123";
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days from now

  // Create user first
  const user = await appDb.users.create(testEmail);

  // Create session
  const session = await appDb.sessions.create(sessionId, user.id, expiresAt);

  expect(session).toBeTruthy();
  expect(session.id).toBe(sessionId);
  expect(session.user_id).toBe(user.id);
  expect(session.expires_at).toBe(expiresAt);
});

test("Sessions: should get session with user info", async () => {
  const testEmail = "getsession@example.com";
  const sessionId = "get-session-123";
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Create user and session
  const user = await appDb.users.create(testEmail);
  await appDb.sessions.create(sessionId, user.id, expiresAt);

  // Get session
  const foundSession = await appDb.sessions.getById(sessionId);

  expect(foundSession).toBeTruthy();
  expect(foundSession.id).toBe(sessionId);
  expect(foundSession.user_id).toBe(user.id);
  expect(foundSession.email).toBe(testEmail);
});

test("Sessions: should not return expired sessions", async () => {
  const testEmail = "expired@example.com";
  const sessionId = "expired-session-123";
  const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago (expired)

  // Create user and expired session
  const user = await appDb.users.create(testEmail);
  await appDb.sessions.create(sessionId, user.id, expiresAt);

  // Try to get expired session
  const foundSession = await appDb.sessions.getById(sessionId);

  expect(foundSession).toBeNull();
});

test("Sessions: should delete session", async () => {
  const testEmail = "delete@example.com";
  const sessionId = "delete-session-123";
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Create user and session
  const user = await appDb.users.create(testEmail);
  await appDb.sessions.create(sessionId, user.id, expiresAt);

  // Verify session exists
  let session = await appDb.sessions.getById(sessionId);
  expect(session).toBeTruthy();

  // Delete session
  const result = await appDb.sessions.delete(sessionId);
  expect(result.changes).toBe(1);

  // Verify session is deleted
  session = await appDb.sessions.getById(sessionId);
  expect(session).toBeNull();
});

test("Sessions: should throw error when deleting non-existent session", async () => {
  const nonExistentSessionId = "non-existent-session";

  await expect(appDb.sessions.delete(nonExistentSessionId)).rejects.toThrow(
    `Session ${nonExistentSessionId} not found`,
  );
});
