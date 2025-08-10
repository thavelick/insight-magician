import indexHtml from "./index.html";
import { handleQuery } from "./routes/query.js";
import { handleSchema } from "./routes/schema.js";
import { handleUpload } from "./routes/upload.js";

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
  },
  development: {
    hmr: true,
    console: true,
  },
});

const port = process.env.PORT || 3000;
console.log(`🚀 Server running at http://localhost:${port}`);
