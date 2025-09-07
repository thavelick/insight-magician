import indexHtml from "./index.html";
import { AppDatabase } from "./lib/app-database.js";
import { logger } from "./lib/logger.js";
import { requireAuth } from "./lib/middleware/auth.js";
import { createAuthRoutes } from "./routes/auth.js";
import { handleChat } from "./routes/chat.js";
import { handleQuery } from "./routes/query.js";
import { handleSchema } from "./routes/schema.js";
import { handleUpload } from "./routes/upload.js";

// App database must be created with 'make setup-db' first
const appDatabase = new AppDatabase();
await appDatabase.connect();

global.appDatabase = appDatabase;

// Create auth routes and middleware
const authRoutes = createAuthRoutes(appDatabase);
const authMiddleware = requireAuth(appDatabase);

// Helper to wrap route handlers with middleware
function withAuth(handler) {
  return async (req, ...args) => {
    const url = new URL(req.url);
    const middlewareResponse = await authMiddleware(req, url);

    // If middleware returns a response, return it (auth failed)
    if (middlewareResponse) {
      return middlewareResponse;
    }

    // Otherwise continue to the actual handler
    return handler(req, ...args);
  };
}

Bun.serve({
  port: process.env.PORT || 3000,
  fetch(req) {
    const url = new URL(req.url);

    // Serve static files from public directory
    if (url.pathname.startsWith("/public/")) {
      const filePath = `.${url.pathname}`;
      return new Response(Bun.file(filePath));
    }
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
    "/api/auth/login": {
      POST: authRoutes.login,
    },
    "/api/auth/verify": {
      GET: authRoutes.verify,
    },
    "/api/auth/status": {
      GET: authRoutes.status,
    },
    "/api/auth/logout": {
      POST: authRoutes.logout,
    },
    "/api/upload": {
      POST: withAuth(handleUpload),
    },
    "/api/schema": {
      GET: withAuth(handleSchema),
    },
    "/api/query": {
      POST: withAuth(handleQuery),
    },
    "/api/chat": {
      POST: withAuth(handleChat),
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

const port = process.env.PORT || 3000;
logger.info(`🚀 Server running at http://localhost:${port}`);
