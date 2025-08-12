---

## Server Management

- DO NOT run `make dev` or start development servers
- DO NOT kill running servers
- User will handle all server management

## Make Commands

Prefer using make commands when available:

- Use `make format` instead of `bun run format`
- Use `make lint` instead of `bun run lint` 
- Use `make check` instead of `bun run check`
- Use `make test-unit` instead of `bun run test:unit`
- Use `make test-integration` instead of `bun run test:integration`
- Use `make test-all` instead of `bun run test:all`
- Use `make install` instead of `bun install`

## Bun Usage

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```js#index.test.js
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support vanilla JS and CSS.

Server:

```js#index.js
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.js"></script>
  </body>
</html>
```

With the following `frontend.js`:

```js#frontend.js
// import .css files directly and it works
import './index.css';

// vanilla JS DOM manipulation
document.addEventListener('DOMContentLoaded', () => {
  const h1 = document.createElement('h1');
  h1.textContent = 'Hello, world!';
  document.body.appendChild(h1);
});
```

Then, run index.js

```sh
bun --hot ./index.js
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Development Guidelines

- DO NOT modify default sample queries, placeholder text, or example code to match specific test databases
- Keep sample code generic and database-agnostic  
- User will handle customizing queries for their specific data
- NEVER commit changes without explicit user permission - always ask first

## Testing Guidelines

### Playwright Integration Tests

- **Run tests sequentially**: Set `workers: 1` in playwright.config.js to avoid database locking issues
- **Response listener timing**: Always set up `page.waitForResponse()` listeners BEFORE triggering actions that cause responses
  - ❌ Wrong: Upload file → Set up schema listener → Wait (race condition, timeouts)
  - ✅ Correct: Set up both listeners → Upload file → Wait for both responses
  - This prevents race conditions where fast API responses complete before the test starts listening
- **Database cleanup**: Tests create temporary databases in `tests/fixtures/test-*.db` - cleanup happens automatically between tests

- never run `npx playwright`. Either run `make test-integration` or `playwright test`