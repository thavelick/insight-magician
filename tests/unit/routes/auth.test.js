import { expect, test } from "bun:test";

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function createSessionCookie(sessionId) {
  const cookie = new Bun.Cookie("session", sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return cookie.toString();
}

test("isValidEmail - validates email formats correctly", () => {
  expect(isValidEmail("test@example.com")).toBe(true);
  expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
  expect(isValidEmail("invalid-email")).toBe(false);
  expect(isValidEmail("@domain.com")).toBe(false);
  expect(isValidEmail("user@")).toBe(false);
  expect(isValidEmail("")).toBe(false);
});

test("createSessionCookie - development mode", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  const cookie = createSessionCookie("abc123");

  expect(cookie).toContain("session=abc123");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Strict");
  expect(cookie).not.toContain("Secure");

  process.env.NODE_ENV = originalNodeEnv;
});

test("createSessionCookie - production mode", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const cookie = createSessionCookie("abc123");

  expect(cookie).toContain("session=abc123");
  expect(cookie).toContain("Secure");

  process.env.NODE_ENV = originalNodeEnv;
});

test("cookie - basic functionality", () => {
  const cookie = new Bun.Cookie("test", "value", {
    path: "/",
    httpOnly: true,
  });

  const cookieString = cookie.toString();
  expect(cookieString).toContain("test=value");
  expect(cookieString).toContain("HttpOnly");
});
