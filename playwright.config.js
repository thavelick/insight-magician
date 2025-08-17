import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  timeout: 10000, // 10 second timeout instead of 30s default
  globalSetup: "./tests/global-setup.js",
  grep: /^(?!.*@expensive).*$/, // Exclude @expensive tests by default
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
