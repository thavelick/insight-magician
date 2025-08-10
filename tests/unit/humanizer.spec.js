import { expect, test } from "bun:test";
import { humanizeField } from "../../lib/humanizer.js";

test("humanizeField - snake_case conversion", () => {
  expect(humanizeField("user_id")).toBe("User ID");
  expect(humanizeField("first_name")).toBe("First Name");
  expect(humanizeField("created_at")).toBe("Created At");
  expect(humanizeField("order_total_amount")).toBe("Order Total Amount");
  expect(humanizeField("api_key")).toBe("API Key");
});

test("humanizeField - camelCase conversion", () => {
  expect(humanizeField("firstName")).toBe("First Name");
  expect(humanizeField("lastName")).toBe("Last Name");
  expect(humanizeField("createdAt")).toBe("Created At");
  expect(humanizeField("orderTotalAmount")).toBe("Order Total Amount");
  expect(humanizeField("apiKey")).toBe("API Key");
});

test("humanizeField - PascalCase conversion", () => {
  expect(humanizeField("UserName")).toBe("User Name");
  expect(humanizeField("FirstName")).toBe("First Name");
  expect(humanizeField("CreatedAt")).toBe("Created At");
  expect(humanizeField("OrderTotalAmount")).toBe("Order Total Amount");
  expect(humanizeField("APIKey")).toBe("API Key");
});

test("humanizeField - kebab-case conversion", () => {
  expect(humanizeField("user-id")).toBe("User ID");
  expect(humanizeField("first-name")).toBe("First Name");
  expect(humanizeField("created-at")).toBe("Created At");
  expect(humanizeField("order-total-amount")).toBe("Order Total Amount");
  expect(humanizeField("api-key")).toBe("API Key");
});

test("humanizeField - common abbreviations", () => {
  expect(humanizeField("id")).toBe("ID");
  expect(humanizeField("url")).toBe("URL");
  expect(humanizeField("api")).toBe("API");
  expect(humanizeField("json")).toBe("JSON");
  expect(humanizeField("html")).toBe("HTML");
  expect(humanizeField("user_url")).toBe("User URL");
  expect(humanizeField("apiEndpoint")).toBe("API Endpoint");
  expect(humanizeField("database_id")).toBe("Database ID");
});

test("humanizeField - edge cases", () => {
  expect(humanizeField("")).toBe("");
  expect(humanizeField("a")).toBe("A");
  expect(humanizeField("A")).toBe("A");
  expect(humanizeField("aB")).toBe("A B");
  expect(humanizeField("a_b")).toBe("A B");
  expect(humanizeField("a-b")).toBe("A B");
});

test("humanizeField - single words", () => {
  expect(humanizeField("name")).toBe("Name");
  expect(humanizeField("email")).toBe("Email");
  expect(humanizeField("password")).toBe("Password");
  expect(humanizeField("status")).toBe("Status");
});

test("humanizeField - invalid input", () => {
  expect(humanizeField(null)).toBe(null);
  expect(humanizeField(undefined)).toBe(undefined);
  expect(humanizeField(123)).toBe(123);
  expect(humanizeField({})).toEqual({});
});

test("humanizeField - mixed cases", () => {
  expect(humanizeField("userID")).toBe("User ID");
  expect(humanizeField("user_ID")).toBe("User ID");
  expect(humanizeField("UserID")).toBe("User ID");
  expect(humanizeField("htmlParser")).toBe("HTML Parser");
  expect(humanizeField("parseHTML")).toBe("Parse HTML");
});
