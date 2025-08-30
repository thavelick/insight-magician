import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { AppDatabase } from "../../../../lib/app-database.js";

const TEST_DB_PATH = "./test-auth-tokens.db";

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

test("AuthTokens: should create auth token", async () => {
  const testEmail = "token@example.com";
  const testToken = "test-token-123";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  // Create user first
  const user = await appDb.users.create(testEmail);

  // Create auth token
  const token = await appDb.authTokens.create(user.id, testToken, expiresAt);

  expect(token).toBeTruthy();
  expect(token.token).toBe(testToken);
  expect(token.expires_at).toBe(expiresAt);
});

test("AuthTokens: should get auth token with user info", async () => {
  const testEmail = "gettoken@example.com";
  const testToken = "get-token-123";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create user and token
  const user = await appDb.users.create(testEmail);
  await appDb.authTokens.create(user.id, testToken, expiresAt);

  // Get token
  const foundToken = await appDb.authTokens.getByToken(testToken);

  expect(foundToken).toBeTruthy();
  expect(foundToken.token).toBe(testToken);
  expect(foundToken.user_id).toBe(user.id);
  expect(foundToken.email).toBe(testEmail);
  expect(foundToken.used_at).toBeNull();
});
