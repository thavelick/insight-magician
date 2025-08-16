import { mock } from "bun:test";

// Block all network calls in unit tests to prevent accidental external API calls
global.fetch = mock(() => {
  throw new Error("BLOCKED: Network calls not allowed in unit tests! Use mocks instead.");
});

// Set test environment
process.env.NODE_ENV = 'test';

// Block Node.js http/https modules just in case anything bypasses fetch
const blockedNetworkError = () => {
  throw new Error("BLOCKED: HTTP requests not allowed in unit tests! Use mocks instead.");
};

// Mock http and https modules
import { mock as mockModule } from "bun:test";
const httpMock = {
  request: blockedNetworkError,
  get: blockedNetworkError,
  post: blockedNetworkError,
};

// Override require for http/https if anything tries to use them
const originalRequire = require;
require = function(id) {
  if (id === 'http' || id === 'https' || id === 'node:http' || id === 'node:https') {
    return httpMock;
  }
  return originalRequire.apply(this, arguments);
};

console.log("🛡️  Unit test network blocking is active");