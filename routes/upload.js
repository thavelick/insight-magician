import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { validateSqliteFile } from "../lib/database.js";

const UPLOADS_DIR = "./uploads";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function handleUpload(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("database");

    if (!file || !file.size) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 100MB" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate SQLite format
    if (!validateSqliteFile(buffer)) {
      return new Response(
        JSON.stringify({ error: "Invalid SQLite file format" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `database_${timestamp}.db`;
    const filePath = join(UPLOADS_DIR, filename);

    // Save file
    await Bun.write(filePath, buffer);

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        size: file.size,
        message: "Database uploaded successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function cleanupOldFiles() {
  // TODO: Implement cleanup of old uploaded files
  // Could run periodically to remove files older than X hours
}
