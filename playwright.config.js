import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  workers: 1, // Run tests sequentially to avoid database locking issues
  use: {
    baseURL: "http://localhost:3001",
  },
  webServer: {
    command: "PORT=3001 bun index.js",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
