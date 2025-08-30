import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { AppDatabase } from "../../../../lib/app-database.js";

const TEST_DB_PATH = "./test-users.db";

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

test("Users: should create user successfully", async () => {
  const testEmail = "test@example.com";

  const user = await appDb.users.create(testEmail);

  expect(user).toBeTruthy();
  expect(user.id).toBeTruthy();
  expect(user.email).toBe(testEmail);
  expect(user.created_at).toBeTruthy();
});

test("Users: should prevent duplicate email addresses", async () => {
  const testEmail = "duplicate@example.com";

  // Create first user
  await appDb.users.create(testEmail);

  // Try to create duplicate - should throw error
  await expect(appDb.users.create(testEmail)).rejects.toThrow(
    "User with email duplicate@example.com already exists",
  );
});

test("Users: should get user by email", async () => {
  const testEmail = "getuser@example.com";

  // Create user first
  const createdUser = await appDb.users.create(testEmail);

  // Get user by email
  const foundUser = await appDb.users.getByEmail(testEmail);

  expect(foundUser).toBeTruthy();
  expect(foundUser.id).toBe(createdUser.id);
  expect(foundUser.email).toBe(testEmail);
});

test("Users: should return null for non-existent email", async () => {
  const foundUser = await appDb.users.getByEmail("nonexistent@example.com");
  expect(foundUser).toBeNull();
});

test("Users: should get user by ID", async () => {
  const testEmail = "getuserbyid@example.com";

  // Create user first
  const createdUser = await appDb.users.create(testEmail);

  // Get user by ID
  const foundUser = await appDb.users.getById(createdUser.id);

  expect(foundUser).toBeTruthy();
  expect(foundUser.id).toBe(createdUser.id);
  expect(foundUser.email).toBe(testEmail);
});

test("Users: should return null for non-existent user ID", async () => {
  const foundUser = await appDb.users.getById(99999);
  expect(foundUser).toBeNull();
});

test("Users: should update last login", async () => {
  const testEmail = "lastlogin@example.com";

  // Create user first
  const user = await appDb.users.create(testEmail);
  expect(user.last_login_at).toBeUndefined();

  // Update last login
  await appDb.users.updateLastLogin(user.id);

  // Get user again to check last_login_at was updated
  const updatedUser = await appDb.users.getById(user.id);
  expect(updatedUser.last_login_at).toBeTruthy();
});

test("Users: should throw error when updating last login for non-existent user", async () => {
  await expect(appDb.users.updateLastLogin(99999)).rejects.toThrow(
    "User with ID 99999 not found",
  );
});