import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

/**
 * Create a SQLite database from a SQL fixture file
 * @param {string} fixtureName - Name of the SQL file in tests/fixtures/sql/ (without .sql extension)
 * @param {string} outputPath - Full path where the database should be created
 * @returns {Promise<void>}
 */
export async function createDatabaseFromFixture(fixtureName, outputPath) {
  const sqlFixturePath = join(
    process.cwd(),
    "tests",
    "fixtures",
    "sql",
    `${fixtureName}.sql`,
  );

  // Remove existing database file if it exists
  await cleanupDatabase(outputPath);

  await new Promise((resolve, reject) => {
    const sqlite3 = spawn("sqlite3", [outputPath, `.read ${sqlFixturePath}`]);
    sqlite3.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sqlite3 process exited with code ${code}`));
    });
  });
}

/**
 * Helper to create a temporary database path for tests with unique naming
 * @param {string} fixtureName - Name of the fixture (e.g., "basic", "empty")
 * @returns {string} Full path to temporary database file with unique name
 */
export function getTempDatabasePath(fixtureName) {
  const tempDir = join(process.cwd(), "tests", "temp");

  // Ensure temp directory exists (synchronously)
  mkdirSync(tempDir, { recursive: true });

  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return join(tempDir, `test-${fixtureName}_${timestamp}_${random}.db`);
}

/**
 * Clean up a database file (safe to call even if file doesn't exist)
 * @param {string} dbPath - Path to database file to remove
 * @returns {Promise<void>}
 */
export async function cleanupDatabase(dbPath) {
  await unlink(dbPath).catch(() => {});
}

/**
 * Clean up an uploaded file from the uploads directory
 * @param {string} filename - Filename in uploads directory to remove
 * @returns {Promise<void>}
 */
export async function cleanupUploadedFile(filename) {
  if (!filename) return;
  const uploadPath = join(process.cwd(), "uploads", filename);
  await unlink(uploadPath).catch(() => {});
}

/**
 * Upload a file through the UI file input
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} filePath - Path to file to upload
 * @returns {Promise<void>}
 */
export async function uploadFileViaUI(page, filePath) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
}
