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
export async function executeQueryAPI(page, uploadedFilename, query, queryParams = {}) {
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

