import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "../lib/logger.js";
async function globalSetup() {
  // Ensure tests/temp directory exists for database helper
  const tempDir = join(process.cwd(), "tests", "temp");
  await mkdir(tempDir, { recursive: true });

  logger.debug("✓ Created tests/temp directory for integration tests");
}

export default globalSetup;
