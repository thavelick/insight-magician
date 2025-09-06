import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { AppDatabase } from "../../../lib/app-database.js";
import { AuthManager } from "../../../lib/auth.js";

const TEST_DB_PATH = "./test-auth.db";

let appDb;
let authManager;

process.env.APP_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.EMAIL_FROM_ADDRESS = "test@example.com";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_AUTH_USER = "test@example.com";
process.env.SMTP_AUTH_PASS = "testpass";

beforeEach(async () => {
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // Ignore - file doesn't exist
  }

  appDb = new AppDatabase(TEST_DB_PATH);
  await appDb.initialize();

  authManager = new AuthManager(appDb);

  authManager.emailService.sendMagicLink = mock(() => Promise.resolve());
});

afterEach(async () => {
  if (appDb) {
    await appDb.disconnect();
  }

  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // Ignore - file doesn't exist
  }
});

describe("AuthManager - Token Generation", () => {
  test("should generate secure tokens", () => {
    const token1 = authManager.generateSecureToken();
    const token2 = authManager.generateSecureToken();

    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64);
    expect(typeof token1).toBe("string");
  });

  test("should generate secure session IDs", () => {
    const sessionId1 = authManager.generateSessionId();
    const sessionId2 = authManager.generateSessionId();

    expect(sessionId1).toBeTruthy();
    expect(sessionId2).toBeTruthy();
    expect(sessionId1).not.toBe(sessionId2);
    expect(sessionId1.length).toBe(64);
    expect(typeof sessionId1).toBe("string");
  });
});

describe("AuthManager - Email Validation", () => {
  test("should validate correct email formats", () => {
    expect(authManager.isValidEmail("test@example.com")).toBe(true);
    expect(authManager.isValidEmail("user.name@domain.co.uk")).toBe(true);
    expect(authManager.isValidEmail("test+tag@example.org")).toBe(true);
  });

  test("should reject invalid email formats", () => {
    expect(authManager.isValidEmail("invalid-email")).toBe(false);
    expect(authManager.isValidEmail("@domain.com")).toBe(false);
    expect(authManager.isValidEmail("user@")).toBe(false);
    expect(authManager.isValidEmail("")).toBe(false);
    expect(authManager.isValidEmail("user@domain")).toBe(false);
  });
});

describe("AuthManager - Magic Link Workflow", () => {
  test("should send magic link for new user", async () => {
    const email = "newuser@example.com";

    const result = await authManager.sendMagicLink(email);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Magic link sent to your email");
    expect(authManager.emailService.sendMagicLink).toHaveBeenCalledTimes(1);

    const user = await appDb.users.getByEmail(email);
    expect(user).toBeTruthy();
    expect(user.email).toBe(email);
  });

  test("should send magic link for existing user", async () => {
    const email = "existing@example.com";

    await appDb.users.create(email);

    const result = await authManager.sendMagicLink(email);

    expect(result.success).toBe(true);
    expect(authManager.emailService.sendMagicLink).toHaveBeenCalledTimes(1);
  });

  test("should normalize email to lowercase", async () => {
    const email = "TEST@EXAMPLE.COM";

    await authManager.sendMagicLink(email);

    const user = await appDb.users.getByEmail("test@example.com");
    expect(user).toBeTruthy();
    expect(user.email).toBe("test@example.com");
  });

  test("should reject invalid email format", async () => {
    const invalidEmail = "invalid-email";

    await expect(authManager.sendMagicLink(invalidEmail)).rejects.toThrow(
      "Invalid email format",
    );
  });
});

describe("AuthManager - Token Verification", () => {
  test("should verify valid token and create session", async () => {
    const email = "verify@example.com";

    await authManager.sendMagicLink(email);

    const user = await appDb.users.getByEmail(email);
    const tokens = await appDb.db
      .prepare(`
      SELECT token FROM auth_tokens WHERE user_id = ? AND used_at IS NULL
    `)
      .all(user.id);

    expect(tokens.length).toBe(1);
    const token = tokens[0].token;

    const result = await authManager.verifyToken(token);

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe(email);
    expect(result.sessionId.length).toBe(64);
  });

  test("should reject invalid token", async () => {
    const invalidToken = "invalid-token";

    await expect(authManager.verifyToken(invalidToken)).rejects.toThrow(
      "Invalid or expired token",
    );
  });

  test("should reject used token", async () => {
    const email = "used@example.com";

    await authManager.sendMagicLink(email);
    const user = await appDb.users.getByEmail(email);
    const tokens = await appDb.db
      .prepare(`
      SELECT token FROM auth_tokens WHERE user_id = ? AND used_at IS NULL
    `)
      .all(user.id);
    const token = tokens[0].token;

    await authManager.verifyToken(token);

    await expect(authManager.verifyToken(token)).rejects.toThrow(
      "Invalid or expired token",
    );
  });

  test("should reject expired token", async () => {
    const email = "expired@example.com";
    const user = await appDb.users.create(email);

    const expiredToken = authManager.generateSecureToken();
    const expiredTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await appDb.authTokens.create(user.id, expiredToken, expiredTime);

    await expect(authManager.verifyToken(expiredToken)).rejects.toThrow(
      "Token has expired",
    );
  });

  test("should reject empty token", async () => {
    await expect(authManager.verifyToken("")).rejects.toThrow(
      "Token is required",
    );

    await expect(authManager.verifyToken(null)).rejects.toThrow(
      "Token is required",
    );
  });
});

describe("AuthManager - Session Management", () => {
  test("should validate active session", async () => {
    const email = "session@example.com";

    const user = await appDb.users.create(email);
    const sessionId = authManager.generateSessionId();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await appDb.sessions.create(sessionId, user.id, expiresAt);

    const sessionUser = await authManager.validateSession(sessionId);

    expect(sessionUser).toBeTruthy();
    expect(sessionUser.id).toBe(user.id);
    expect(sessionUser.email).toBe(email);
    expect(sessionUser.sessionId).toBe(sessionId);
  });

  test("should return null for invalid session", async () => {
    const invalidSessionId = "invalid-session";

    const sessionUser = await authManager.validateSession(invalidSessionId);
    expect(sessionUser).toBeNull();
  });

  test("should return null for expired session", async () => {
    const email = "expired-session@example.com";
    const user = await appDb.users.create(email);
    const sessionId = authManager.generateSessionId();

    const expiredTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await appDb.sessions.create(sessionId, user.id, expiredTime);

    const sessionUser = await authManager.validateSession(sessionId);
    expect(sessionUser).toBeNull();
  });

  test("should handle null session gracefully", async () => {
    const sessionUser = await authManager.validateSession(null);
    expect(sessionUser).toBeNull();
  });
});

describe("AuthManager - Logout", () => {
  test("should logout and delete session", async () => {
    const email = "logout@example.com";
    const user = await appDb.users.create(email);
    const sessionId = authManager.generateSessionId();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await appDb.sessions.create(sessionId, user.id, expiresAt);

    let session = await appDb.sessions.getValidById(sessionId);
    expect(session).toBeTruthy();

    const result = await authManager.logout(sessionId);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Logged out successfully");

    session = await appDb.sessions.getValidById(sessionId);
    expect(session).toBeNull();
  });

  test("should handle logout with no session gracefully", async () => {
    const result = await authManager.logout(null);
    expect(result.success).toBe(true);
    expect(result.message).toBe("No session to logout");
  });

  test("should handle logout with invalid session", async () => {
    const invalidSessionId = "invalid-session";

    await expect(authManager.logout(invalidSessionId)).rejects.toThrow(
      `Session ${invalidSessionId} not found`,
    );
  });
});

describe("AuthManager - Cleanup", () => {
  test("should run cleanup without errors", async () => {
    const result = await authManager.cleanupExpired();
    expect(result.success).toBe(true);
    expect(result.message).toBe("Cleanup completed");
  });
});
