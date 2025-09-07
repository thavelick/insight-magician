import { expect, test } from "bun:test";

test("Bun.Cookie - creates session cookie", () => {
  const cookie = new Bun.Cookie("session", "abc123", {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
  });

  const cookieString = cookie.toString();
  expect(cookieString).toContain("session=abc123");
  expect(cookieString).toContain("HttpOnly");
});

test("Bun.Cookie - creates expired cookie for clearing", () => {
  const expiredCookie = new Bun.Cookie("session", "", {
    maxAge: 0,
  });

  const cookieString = expiredCookie.toString();
  expect(cookieString).toContain("session=");
  expect(cookieString).toContain("Max-Age=0");
});
