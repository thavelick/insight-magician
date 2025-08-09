import indexHtml from "./index.html";

Bun.serve({
  port: process.env.PORT || 3000,
  routes: {
    "/": indexHtml,
    "/api/upload": {
      POST: (req) => {
        // TODO: Implement file upload
        return new Response("Upload endpoint", { status: 501 });
      },
    },
    "/api/schema": {
      GET: (req) => {
        // TODO: Implement schema introspection
        return new Response("Schema endpoint", { status: 501 });
      },
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