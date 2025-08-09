import indexHtml from "./index.html";
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
    "/api/upload": {
      POST: handleUpload,
    },
    "/api/schema": {
      GET: handleSchema,
    },
    "/api/query": {
      POST: (req) => {
        // TODO: Implement query execution
        return new Response("Query endpoint", { status: 501 });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

const port = process.env.PORT || 3000;
console.log(`🚀 Server running at http://localhost:${port}`);
