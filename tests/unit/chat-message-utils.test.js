import { describe, expect, test } from "bun:test";
import {
  MESSAGE_ROLES,
  countWords,
  createEchoResponse,
  formatContent,
  formatTimestamp,
  getMessageClasses,
  getPreview,
  getRoleClass,
  getRoleDisplayName,
  isEmpty,
  isValidContent,
  isValidMessage,
  isValidRole,
  normalizeContent,
  truncate,
} from "../../lib/chat-message-utils.js";

describe("Chat Message Functions", () => {
  describe("Role Validation", () => {
    test("should validate correct roles", () => {
      expect(isValidRole("user")).toBe(true);
      expect(isValidRole("assistant")).toBe(true);
      expect(isValidRole(MESSAGE_ROLES.USER)).toBe(true);
      expect(isValidRole(MESSAGE_ROLES.ASSISTANT)).toBe(true);
    });

    test("should reject invalid roles", () => {
      expect(isValidRole("invalid")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole(123)).toBe(false);
    });

    test("should have correct role constants", () => {
      expect(MESSAGE_ROLES.USER).toBe("user");
      expect(MESSAGE_ROLES.ASSISTANT).toBe("assistant");
    });
  });

  describe("Content Validation", () => {
    test("should validate correct content", () => {
      expect(isValidContent("Hello world")).toBe(true);
      expect(isValidContent("  Valid content  ")).toBe(true);
      expect(isValidContent("123")).toBe(true);
      expect(isValidContent("!@#$%")).toBe(true);
    });

    test("should reject invalid content", () => {
      expect(isValidContent("")).toBe(false);
      expect(isValidContent("   ")).toBe(false);
      expect(isValidContent(null)).toBe(false);
      expect(isValidContent(undefined)).toBe(false);
      expect(isValidContent(123)).toBe(false);
      expect(isValidContent({})).toBe(false);
    });

    test("should check if content is empty", () => {
      expect(isEmpty("")).toBe(true);
      expect(isEmpty("   ")).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty("Hello")).toBe(false);
      expect(isEmpty("  Hello  ")).toBe(false);
    });
  });

  describe("Content Normalization", () => {
    test("should normalize content by trimming", () => {
      expect(normalizeContent("  Hello world  ")).toBe("Hello world");
      expect(normalizeContent("\n\tTest\n\t")).toBe("Test");
    });

    test("should handle non-string content", () => {
      expect(normalizeContent(null)).toBe("");
      expect(normalizeContent(undefined)).toBe("");
      expect(normalizeContent(123)).toBe("");
      expect(normalizeContent({})).toBe("");
    });

    test("should format content preserving structure", () => {
      const multiline = "Line 1\nLine 2\nLine 3";
      expect(formatContent(multiline)).toBe(multiline);

      const withSpaces = "  Hello  world  ";
      expect(formatContent(withSpaces)).toBe("Hello  world");
    });
  });

  describe("CSS Class Generation", () => {
    test("should generate role-specific classes", () => {
      expect(getRoleClass("user")).toBe("ai-chat-message-user");
      expect(getRoleClass("assistant")).toBe("ai-chat-message-assistant");
    });

    test("should generate complete message classes", () => {
      expect(getMessageClasses("user")).toBe(
        "ai-chat-message ai-chat-message-user",
      );
      expect(getMessageClasses("assistant")).toBe(
        "ai-chat-message ai-chat-message-assistant",
      );
    });
  });

  describe("Message Validation", () => {
    test("should validate complete message objects", () => {
      const validMessage = {
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      };

      expect(isValidMessage(validMessage)).toBe(true);
    });

    test("should reject invalid message objects", () => {
      const validBase = {
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      };

      expect(isValidMessage({ ...validBase, role: "invalid" })).toBe(false);
      expect(isValidMessage({ ...validBase, content: "" })).toBe(false);
      expect(isValidMessage({ ...validBase, timestamp: -1 })).toBe(false);
      expect(isValidMessage({ ...validBase, timestamp: "invalid" })).toBe(
        false,
      );
      expect(isValidMessage(null)).toBe(false);
      expect(isValidMessage(undefined)).toBe(false);
      expect(isValidMessage("not an object")).toBe(false);
    });
  });

  describe("Echo Response", () => {
    test("should create echo response", () => {
      expect(createEchoResponse("Hello")).toBe("Echo: Hello");
      expect(createEchoResponse("Test message")).toBe("Echo: Test message");
    });
  });

  describe("Role Display Names", () => {
    test("should return correct display names", () => {
      expect(getRoleDisplayName("user")).toBe("You");
      expect(getRoleDisplayName("assistant")).toBe("AI");
      expect(getRoleDisplayName("invalid")).toBe("Unknown");
    });
  });

  describe("Content Utilities", () => {
    test("should truncate long content", () => {
      const longText = "a".repeat(100);
      const truncated = truncate(longText, 50);

      expect(truncated).toHaveLength(50);
      expect(truncated.endsWith("...")).toBe(true);
      expect(truncated).toBe(`${"a".repeat(47)}...`);
    });

    test("should not truncate short content", () => {
      const shortText = "Hello world";
      expect(truncate(shortText, 50)).toBe(shortText);
      expect(truncate(shortText)).toBe(shortText);
    });

    test("should handle empty content in truncate", () => {
      expect(truncate("")).toBe("");
      expect(truncate(null)).toBe(null);
      expect(truncate(undefined)).toBe(undefined);
    });

    test("should generate preview text", () => {
      const multiline = "First line\nSecond line\nThird line";
      expect(getPreview(multiline)).toBe("First line");

      const longLine = "a".repeat(100);
      const preview = getPreview(longLine, 20);
      expect(preview).toHaveLength(20);
      expect(preview.endsWith("...")).toBe(true);
    });

    test("should handle empty content in preview", () => {
      expect(getPreview("")).toBe("");
      expect(getPreview(null)).toBe("");
    });

    test("should count words correctly", () => {
      expect(countWords("Hello world")).toBe(2);
      expect(countWords("  One  two   three  ")).toBe(3);
      expect(countWords("Single")).toBe(1);
      expect(countWords("")).toBe(0);
      expect(countWords("   ")).toBe(0);
      expect(countWords(null)).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle special characters in content", () => {
      const specialChars = "<script>alert('xss')</script>";
      expect(normalizeContent(specialChars)).toBe(specialChars);
      expect(formatContent(specialChars)).toBe(specialChars);
      expect(isValidContent(specialChars)).toBe(true);
    });

    test("should handle unicode characters", () => {
      const unicode = "Hello 👋 World 🌍";
      expect(normalizeContent(unicode)).toBe(unicode);
      expect(formatContent(unicode)).toBe(unicode);
      expect(isValidContent(unicode)).toBe(true);
    });

    test("should handle very long content", () => {
      const veryLong = "word ".repeat(1000);
      expect(isValidContent(veryLong)).toBe(true);
      expect(formatContent(veryLong)).toBe(veryLong.trim());
    });
  });

  describe("Timestamp Formatting", () => {
    test("should format recent timestamps as 'just now'", () => {
      const now = Date.now();
      const thirtySecondsAgo = now - 30 * 1000;

      expect(formatTimestamp(now)).toBe("just now");
      expect(formatTimestamp(thirtySecondsAgo)).toBe("just now");
    });

    test("should format timestamps within an hour as minutes ago", () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const thirtyMinutesAgo = now - 30 * 60 * 1000;

      expect(formatTimestamp(fiveMinutesAgo)).toBe("5m ago");
      expect(formatTimestamp(thirtyMinutesAgo)).toBe("30m ago");
    });

    test("should format timestamps within a day as hours ago", () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

      expect(formatTimestamp(twoHoursAgo)).toBe("2h ago");
      expect(formatTimestamp(twelveHoursAgo)).toBe("12h ago");
    });

    test("should format timestamps within a week as days ago", () => {
      const now = Date.now();
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
      const sixDaysAgo = now - 6 * 24 * 60 * 60 * 1000;

      expect(formatTimestamp(twoDaysAgo)).toBe("2d ago");
      expect(formatTimestamp(sixDaysAgo)).toBe("6d ago");
    });

    test("should format old timestamps as date strings", () => {
      const now = Date.now();
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

      const twoWeeksDate = new Date(twoWeeksAgo).toLocaleDateString();
      const oneMonthDate = new Date(oneMonthAgo).toLocaleDateString();

      expect(formatTimestamp(twoWeeksAgo)).toBe(twoWeeksDate);
      expect(formatTimestamp(oneMonthAgo)).toBe(oneMonthDate);
    });

    test("should handle edge cases", () => {
      const now = Date.now();
      const exactlyOneMinute = now - 60 * 1000;
      const exactlyOneHour = now - 60 * 60 * 1000;
      const exactlyOneDay = now - 24 * 60 * 60 * 1000;

      expect(formatTimestamp(exactlyOneMinute)).toBe("1m ago");
      expect(formatTimestamp(exactlyOneHour)).toBe("1h ago");
      expect(formatTimestamp(exactlyOneDay)).toBe("1d ago");
    });
  });
});
