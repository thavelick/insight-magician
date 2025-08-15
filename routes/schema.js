import { join } from "node:path";
import { DatabaseManager } from "../lib/database.js";

const UPLOADS_DIR = "./uploads";

export async function handleSchema(request) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");

    if (!filename) {
      return new Response(
        JSON.stringify({ error: "Missing filename parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Security: ensure filename doesn't contain path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = join(UPLOADS_DIR, filename);

    // Check if file exists
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response(
        JSON.stringify({ error: "Database file not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const dbManager = new DatabaseManager(filePath);

    try {
      const schema = await dbManager.getSchema();

      return new Response(
        JSON.stringify({
          success: true,
          schema,
          filename,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (dbError) {
      // Handle database-specific errors (corrupted files, etc.)
      if (
        dbError.code === "SQLITE_NOTADB" ||
        dbError.message?.includes("file is not a database")
      ) {
        return new Response(
          JSON.stringify({ error: "Database file is corrupted or invalid" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      throw dbError;
    } finally {
      await dbManager.disconnect();
    }
  } catch (error) {
    console.error("Schema error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to read database schema" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
