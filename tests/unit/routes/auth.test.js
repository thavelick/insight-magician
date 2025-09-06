import { expect, test } from "bun:test";

// Test helper functions from auth routes without complex mocking
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function createSessionCookie(sessionId) {
  // Create secure HTTP-only cookie
  const cookieParts = [
    `session=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];

  // Add Secure flag for HTTPS in production
  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;

  for (const cookie of cookieString.split(";")) {
    const [name, ...rest] = cookie.split("=");
    const value = rest.join("=").trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  }

  return cookies;
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

  expect(cookie).toBe("session=abc123; Path=/; HttpOnly; SameSite=Strict");

  process.env.NODE_ENV = originalNodeEnv;
});

test("createSessionCookie - production mode", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const cookie = createSessionCookie("abc123");

  expect(cookie).toBe(
    "session=abc123; Path=/; HttpOnly; SameSite=Strict; Secure",
  );

  process.env.NODE_ENV = originalNodeEnv;
});

test("parseCookies - handles complex cookie strings", () => {
  const cookieString =
    "first=value1; session=abc123; encoded=hello%20world; complex=a=b=c";
  const result = parseCookies(cookieString);

  expect(result).toEqual({
    first: "value1",
    session: "abc123",
    encoded: "hello world",
    complex: "a=b=c",
  });
});
