import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ChatHistory } from "../../lib/chat-history.js";

describe("ChatHistory", () => {
  let chatHistory;

  beforeEach(() => {
    chatHistory = new ChatHistory("test-history", 5); // Small limit for testing
  });

  describe("Message Creation", () => {
    test("should create valid message with timestamp", () => {
      const beforeTime = Date.now();
      const message = chatHistory.createMessage("user", "Hello world");
      const afterTime = Date.now();

      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello world");
      expect(message.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(message.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test("should throw error for invalid role", () => {
      expect(() => {
        chatHistory.createMessage("invalid", "Hello");
      }).toThrow("Invalid role: invalid");
    });

    test("should throw error for empty content", () => {
      expect(() => {
        chatHistory.createMessage("user", "");
      }).toThrow("Content must be a non-empty string");

      expect(() => {
        chatHistory.createMessage("user", "   ");
      }).toThrow("Content must be a non-empty string");
    });

    test("should sanitize content by trimming", () => {
      const message = chatHistory.createMessage("user", "  Hello world  ");
      expect(message.content).toBe("Hello world");
    });
  });

  describe("Message Management", () => {
    test("should add messages and maintain order", () => {
      chatHistory.addMessage("user", "First");
      chatHistory.addMessage("assistant", "Second");
      chatHistory.addMessage("user", "Third");

      const messages = chatHistory.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
      expect(messages[2].content).toBe("Third");
    });

    test("should return copy of messages to prevent mutation", () => {
      chatHistory.addMessage("user", "Test");
      const messages1 = chatHistory.getMessages();
      const messages2 = chatHistory.getMessages();

      expect(messages1).not.toBe(messages2); // Different references
      expect(messages1).toEqual(messages2); // Same content
    });

    test("should get message count", () => {
      expect(chatHistory.getMessageCount()).toBe(0);

      chatHistory.addMessage("user", "First");
      expect(chatHistory.getMessageCount()).toBe(1);

      chatHistory.addMessage("assistant", "Second");
      expect(chatHistory.getMessageCount()).toBe(2);
    });

    test("should clear all messages", () => {
      chatHistory.addMessage("user", "Test");
      chatHistory.addMessage("assistant", "Response");
      expect(chatHistory.getMessageCount()).toBe(2);

      chatHistory.clear();
      expect(chatHistory.getMessageCount()).toBe(0);
      expect(chatHistory.getMessages()).toEqual([]);
    });
  });

  describe("Message Limit Enforcement", () => {
    test("should enforce maximum message limit", () => {
      for (let i = 1; i <= 7; i++) {
        chatHistory.addMessage("user", `Message ${i}`);
      }

      const messages = chatHistory.getMessages();
      expect(messages).toHaveLength(5);

      expect(messages[0].content).toBe("Message 3");
      expect(messages[4].content).toBe("Message 7");
    });

    test("should get recent messages with custom limit", () => {
      for (let i = 1; i <= 5; i++) {
        chatHistory.addMessage("user", `Message ${i}`);
      }

      const recent = chatHistory.getRecentMessages(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].content).toBe("Message 3");
      expect(recent[2].content).toBe("Message 5");
    });
  });

  describe("Serialization", () => {
    test("should serialize messages to JSON", () => {
      chatHistory.addMessage("user", "Hello");
      chatHistory.addMessage("assistant", "Hi there");

      const serialized = chatHistory.serialize();
      const parsed = JSON.parse(serialized);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].role).toBe("user");
      expect(parsed[0].content).toBe("Hello");
      expect(parsed[1].role).toBe("assistant");
      expect(parsed[1].content).toBe("Hi there");
    });

    test("should deserialize valid JSON", () => {
      const data = JSON.stringify([
        { role: "user", content: "Test", timestamp: 123456 },
        { role: "assistant", content: "Response", timestamp: 123457 },
      ]);

      chatHistory.deserialize(data);
      const messages = chatHistory.getMessages();

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Test");
      expect(messages[1].content).toBe("Response");
    });

    test("should throw error for invalid JSON", () => {
      expect(() => {
        chatHistory.deserialize("invalid json");
      }).toThrow();
    });

    test("should throw error for non-array data", () => {
      expect(() => {
        chatHistory.deserialize('{"not": "array"}');
      }).toThrow("Invalid chat history format: expected array");
    });

    test("should throw error for invalid message format", () => {
      const invalidData = JSON.stringify([
        { role: "user", content: "Valid", timestamp: 123456 },
        { role: "invalid", content: "Bad role", timestamp: 123457 },
      ]);

      expect(() => {
        chatHistory.deserialize(invalidData);
      }).toThrow("Invalid message format in chat history");
    });

    test("should enforce limit after deserialization", () => {
      const manyMessages = [];
      for (let i = 1; i <= 10; i++) {
        manyMessages.push({
          role: "user",
          content: `Message ${i}`,
          timestamp: 123456 + i,
        });
      }

      chatHistory.deserialize(JSON.stringify(manyMessages));

      expect(chatHistory.getMessageCount()).toBe(5);

      const messages = chatHistory.getMessages();
      expect(messages[0].content).toBe("Message 6");
      expect(messages[4].content).toBe("Message 10");
    });
  });

  describe("Storage Operations", () => {
    test("should save to storage", () => {
      const mockStorage = {
        setItem: mock(),
      };

      chatHistory.addMessage("user", "Test message");
      chatHistory.save(mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "test-history",
        expect.stringContaining("Test message"),
      );
    });

    test("should load from storage", () => {
      const savedData = JSON.stringify([
        { role: "user", content: "Saved message", timestamp: 123456 },
      ]);

      const mockStorage = {
        getItem: mock(() => savedData),
      };

      const loaded = chatHistory.load(mockStorage);

      expect(loaded).toBe(true);
      expect(mockStorage.getItem).toHaveBeenCalledWith("test-history");
      expect(chatHistory.getMessageCount()).toBe(1);
      expect(chatHistory.getMessages()[0].content).toBe("Saved message");
    });

    test("should handle missing storage data", () => {
      const mockStorage = {
        getItem: mock(() => null),
      };

      const loaded = chatHistory.load(mockStorage);

      expect(loaded).toBe(false);
      expect(chatHistory.getMessageCount()).toBe(0);
    });

    test("should handle corrupted storage data", () => {
      const mockStorage = {
        getItem: mock(() => "corrupted data"),
      };

      const loaded = chatHistory.load(mockStorage);

      expect(loaded).toBe(false);
      expect(chatHistory.getMessageCount()).toBe(0);
    });
  });

  describe("Validation", () => {
    test("should validate roles correctly", () => {
      expect(chatHistory.isValidRole("user")).toBe(true);
      expect(chatHistory.isValidRole("assistant")).toBe(true);
      expect(chatHistory.isValidRole("invalid")).toBe(false);
      expect(chatHistory.isValidRole("")).toBe(false);
      expect(chatHistory.isValidRole(null)).toBe(false);
    });

    test("should validate content correctly", () => {
      expect(chatHistory.isValidContent("Hello")).toBe(true);
      expect(chatHistory.isValidContent("  Valid  ")).toBe(true);
      expect(chatHistory.isValidContent("")).toBe(false);
      expect(chatHistory.isValidContent("   ")).toBe(false);
      expect(chatHistory.isValidContent(null)).toBe(false);
      expect(chatHistory.isValidContent(123)).toBe(false);
    });

    test("should validate complete messages", () => {
      const validMessage = {
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      };

      expect(chatHistory.isValidMessage(validMessage)).toBe(true);
      expect(
        chatHistory.isValidMessage({ ...validMessage, role: "invalid" }),
      ).toBe(false);
      expect(chatHistory.isValidMessage({ ...validMessage, content: "" })).toBe(
        false,
      );
      expect(
        chatHistory.isValidMessage({ ...validMessage, timestamp: -1 }),
      ).toBe(false);
      expect(chatHistory.isValidMessage(null)).toBe(false);
    });
  });

  describe("API Message Format", () => {
    test("should format messages for API calls", () => {
      chatHistory.addMessage("user", "Hello");
      chatHistory.addMessage("assistant", "Hi there");

      const apiMessages = chatHistory.getApiMessages();

      expect(apiMessages).toHaveLength(2);
      expect(apiMessages[0]).toEqual({ role: "user", content: "Hello" });
      expect(apiMessages[1]).toEqual({
        role: "assistant",
        content: "Hi there",
      });

      expect(apiMessages[0].timestamp).toBeUndefined();
    });

    test("should respect limit in API messages", () => {
      for (let i = 1; i <= 5; i++) {
        chatHistory.addMessage("user", `Message ${i}`);
      }

      const apiMessages = chatHistory.getApiMessages(3);
      expect(apiMessages).toHaveLength(3);
      expect(apiMessages[0].content).toBe("Message 3");
      expect(apiMessages[2].content).toBe("Message 5");
    });
  });

  describe("Error Handling", () => {
    test("should throw error when saving fails", () => {
      const mockStorage = {
        setItem: mock(() => {
          throw new Error("Storage full");
        }),
      };

      chatHistory.addMessage("user", "Test");

      expect(() => {
        chatHistory.save(mockStorage);
      }).toThrow("Failed to save chat history");
    });
  });
});
