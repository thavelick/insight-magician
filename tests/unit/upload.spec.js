import { describe, expect, mock, test } from "bun:test";
import { MAX_FILE_SIZE } from "../../lib/constants.js";
import { handleUpload } from "../../routes/upload.js";

describe("Upload Handler", () => {
  test("should reject files exceeding MAX_FILE_SIZE", async () => {
    // Mock file that exceeds size limit
    const oversizedFile = {
      size: MAX_FILE_SIZE + 1,
      name: "large.db",
      type: "application/x-sqlite3",
      arrayBuffer: mock(() => Promise.resolve(new ArrayBuffer(0))),
    };

    // Mock FormData
    const mockFormData = {
      get: mock(() => oversizedFile),
    };

    // Mock request with formData method
    const mockRequest = {
      formData: mock(() => Promise.resolve(mockFormData)),
    };

    const response = await handleUpload(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe("File too large. Maximum size is 100MB");
    expect(oversizedFile.arrayBuffer).not.toHaveBeenCalled(); // Should not read file buffer
  });

  test("should accept files within size limit", async () => {
    // Mock SQLite file content (SQLite header)
    const sqliteHeader = new ArrayBuffer(16);
    const view = new Uint8Array(sqliteHeader);
    view.set([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
      0x74, 0x20, 0x33, 0x00,
    ]);

    // Mock file within size limit
    const validFile = {
      size: 1024, // 1KB - well within limit
      name: "test.db",
      type: "application/x-sqlite3",
      arrayBuffer: mock(() => Promise.resolve(sqliteHeader)),
    };

    // Mock FormData
    const mockFormData = {
      get: mock(() => validFile),
    };

    // Mock request
    const mockRequest = {
      formData: mock(() => Promise.resolve(mockFormData)),
    };

    // Mock Bun.write to avoid actual file writing
    const originalWrite = Bun.write;
    Bun.write = mock(() => Promise.resolve());

    try {
      const response = await handleUpload(mockRequest);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.filename).toBeDefined();
      expect(validFile.arrayBuffer).toHaveBeenCalled(); // Should read file buffer for validation
    } finally {
      // Restore original Bun.write
      Bun.write = originalWrite;
    }
  });

  test("should reject empty files", async () => {
    // Mock empty file
    const emptyFile = {
      size: 0,
      name: "empty.db",
    };

    // Mock FormData
    const mockFormData = {
      get: mock(() => emptyFile),
    };

    // Mock request
    const mockRequest = {
      formData: mock(() => Promise.resolve(mockFormData)),
    };

    const response = await handleUpload(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe("No file uploaded");
  });
});
