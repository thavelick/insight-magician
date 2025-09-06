import indexHtml from "./index.html";
import { AppDatabase } from "./lib/app-database.js";
import { logger } from "./lib/logger.js";
import { handleChat } from "./routes/chat.js";
import { handleQuery } from "./routes/query.js";
import { handleSchema } from "./routes/schema.js";
import { handleUpload } from "./routes/upload.js";

// App database must be created with 'make setup-db' first
const appDatabase = new AppDatabase();
await appDatabase.connect();

global.appDatabase = appDatabase;

Bun.serve({
  port: process.env.PORT || 3000,
  fetch(req) {
    const url = new URL(req.url);

    // Serve static files from public directory
    if (url.pathname.startsWith("/public/")) {
      const filePath = `.${url.pathname}`;
      return new Response(Bun.file(filePath));
    }

    return null; // Let routes handle other requests
  },
  routes: {
    "/": indexHtml,
    "/status": {
      GET: (req) => {
        return new Response(
          JSON.stringify({ status: "ok", message: "Server is running" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
    "/api/upload": {
      POST: handleUpload,
    },
    "/api/schema": {
      GET: handleSchema,
    },
    "/api/query": {
      POST: handleQuery,
    },
    "/api/chat": {
      POST: handleChat,
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

const port = process.env.PORT || 3000;
logger.info(`🚀 Server running at http://localhost:${port}`);
