import { beforeEach, expect, mock, test } from "bun:test";

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

test("parseCookies - empty string", () => {
  const result = parseCookies("");
  expect(result).toEqual({});
});

test("parseCookies - single cookie", () => {
  const result = parseCookies("session=abc123");
  expect(result).toEqual({ session: "abc123" });
});

test("parseCookies - multiple cookies", () => {
  const result = parseCookies("first=value1; session=abc123; last=value2");
  expect(result).toEqual({
    first: "value1",
    session: "abc123",
    last: "value2",
  });
});

test("parseCookies - handles URL encoded values", () => {
  const result = parseCookies("encoded=hello%20world");
  expect(result).toEqual({ encoded: "hello world" });
});

test("parseCookies - handles equals in value", () => {
  const result = parseCookies("token=abc=def=ghi");
  expect(result).toEqual({ token: "abc=def=ghi" });
});
