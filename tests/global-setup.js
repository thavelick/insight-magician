import { mkdir } from "node:fs/promises";
import { join } from "node:path";

async function globalSetup() {
  // Ensure tests/temp directory exists for database helper
  const tempDir = join(process.cwd(), "tests", "temp");
  await mkdir(tempDir, { recursive: true });

  console.log("✓ Created tests/temp directory for integration tests");
}

export default globalSetup;
