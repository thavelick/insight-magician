import { expect } from "@playwright/test";
import {
  cleanupDatabase,
  createDatabaseFromFixture,
  getTempDatabasePath,
  uploadFileViaUI,
} from "./database.js";

/**
 * Set up a test database, upload it via UI, and return the uploaded filename
 * This is the most common pattern across integration tests
 *
 * @param {object} page - Playwright page object
 * @param {string} fixtureName - Name of SQL fixture (defaults to "basic")
 * @returns {Promise<{uploadedFilename: string}>}
 */
export async function setupDatabaseWithUpload(page, fixtureName = "basic") {
  const testDbPath = getTempDatabasePath(fixtureName);
  await createDatabaseFromFixture(fixtureName, testDbPath);

  const uploadResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/upload"),
  );

  await uploadFileViaUI(page, testDbPath);

  const uploadResponse = await uploadResponsePromise;
  const uploadBody = await uploadResponse.json();
  const uploadedFilename = uploadBody.filename;

  await cleanupDatabase(testDbPath);
  return { uploadedFilename };
}

/**
 * Execute a query via the API with optional pagination parameters
 * Common helper for testing query endpoints directly
 *
 * @param {object} page - Playwright page object
 * @param {string} uploadedFilename - Database filename
 * @param {string} query - SQL query to execute
 * @param {object} queryParams - Optional pagination/query parameters
 * @returns {Promise<Response>} - Playwright response object
 */
export async function executeQueryAPI(
  page,
  uploadedFilename,
  query,
  queryParams = {},
) {
  const defaultParams = {
    filename: uploadedFilename,
    query: query,
    page: 1,
    pageSize: 50,
  };

  return await page.request.post("/api/query", {
    data: { ...defaultParams, ...queryParams },
  });
}

/**
 * Add a widget to the dashboard and wait for it to be ready
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function addWidget(page) {
  const currentWidgetCount = await page.locator(".widget").count();
  await page.click("button:has-text('Add Widget')");

  // Wait for the new widget count to increase
  await expect(page.locator(".widget")).toHaveCount(currentWidgetCount + 1);

  // Wait for the newest widget to have a query editor visible
  await expect(
    page.locator(".widget").last().locator(".query-editor"),
  ).toBeVisible();
}

/**
 * Run a query in a widget and return the API response
 *
 * @param {object} page - Playwright page object
 * @param {string} query - SQL query to execute
 * @returns {Promise<Response>} API response
 */
export async function runQueryInWidget(page, query) {
  await page.fill(".widget .query-editor", query);

  const queryResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/query"),
  );

  await page.click(".widget .run-view-btn");
  return await queryResponsePromise;
}

/**
 * Reload the page and wait for it to be ready
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function reloadAndWait(page) {
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Verify database selection UI is available
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function verifyDatabaseLoaded(page) {
  await expect(page.locator("button:has-text('View Schema')")).toBeVisible();
  await expect(page.locator("#add-widget")).toBeVisible();
}

/**
 * Open schema sidebar and verify it displays
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function openSchemaSidebar(page) {
  await page.click("button:has-text('View Schema')");
  await expect(page.locator(".schema-sidebar")).toBeVisible();
  await expect(page.locator(".schema-content >> text=users")).toBeVisible();
}
