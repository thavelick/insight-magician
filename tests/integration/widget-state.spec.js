import { expect, test } from "@playwright/test";
import {
  cleanupDatabase,
  cleanupUploadedFile,
  createDatabaseFromFixture,
  getTempDatabasePath,
  uploadFileViaUI,
} from "../helpers/database.js";

test.describe("Widget State Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

// Helper functions shared across all tests

async function setupDatabase(page, fixtureName = "basic") {
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

async function addWidget(page) {
  await page.click("button:has-text('Add Widget')");
  await expect(page.locator(".widget .query-editor")).toBeVisible();
}

async function runQueryInWidget(page, query) {
  await page.fill(".widget .query-editor", query);
  
  const queryResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/query"),
  );

  await page.click(".widget .run-view-btn");
  return await queryResponsePromise;
}

async function setupTestCleanup(uploadedFilename) {
  await cleanupUploadedFile(uploadedFilename);
}

  test("should create and delete widgets properly", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    await expect(page.locator(".widget")).toHaveCount(0);

    await addWidget(page);
    await expect(page.locator(".widget")).toHaveCount(1);

    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toHaveCount(2);

    // Wait for widgets to finish their flip animation (widgets start by flipping to edit mode)
    await page.waitForTimeout(500);

    // Set up dialog handler for all deletions
    page.on("dialog", (dialog) => dialog.accept());

    await page
      .locator(".widget")
      .nth(0)
      .locator(".card-back .delete-btn")
      .click({ force: true });
    await expect(page.locator(".widget")).toHaveCount(1);

    await page
      .locator(".widget")
      .nth(0)
      .locator(".card-back .delete-btn")
      .click({ force: true });
    await expect(page.locator(".widget")).toHaveCount(0);

    await expect(page.locator(".upload-area")).toBeVisible();

    await setupTestCleanup(uploadedFilename);
  });

  test("should flip between edit and view modes correctly", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Widgets start in edit mode after creation
    await addWidget(page);

    await runQueryInWidget(page, "SELECT name, email FROM users WHERE name LIKE 'A%'");

    // Should now be in view mode showing results
    await expect(page.locator(".widget .results-table")).toBeVisible();
    await expect(page.locator(".widget .edit-btn")).toBeVisible();

    await page.click(".widget .edit-btn");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    await setupTestCleanup(uploadedFilename);
  });

  test("should persist selected database across page reload", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabase(page);

    await expect(page.locator("button:has-text('View Schema')")).toBeVisible();

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Database should still be selected (from sessionStorage)
    await expect(page.locator("button:has-text('View Schema')")).toBeVisible();

    await setupTestCleanup(uploadedFilename);
  });

  test("should execute queries through widget interface", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    await addWidget(page);
    const queryResponse = await runQueryInWidget(page, "SELECT name, email FROM users WHERE name LIKE 'A%'");

    // Verify query executed successfully
    expect(queryResponse.status()).toBe(200);
    const queryBody = await queryResponse.json();
    expect(queryBody.success).toBe(true);
    expect(queryBody.columns).toEqual(["name", "email"]);

    // Verify UI shows results
    await expect(page.locator(".widget .results-table")).toBeVisible();
    await expect(page.locator("text=Alice Johnson")).toBeVisible();

    await setupTestCleanup(uploadedFilename);
  });

  test("should render basic chart for graph widgets", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    await addWidget(page);

    await page.selectOption(".widget .widget-type-select", "graph");

    const chartFunction = `
function createChart(data, svg, d3, width, height) {
  svg.append('circle')
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', 50)
    .attr('fill', 'blue');
  return svg;
}`;

    await page.fill(".widget .chart-function-editor", chartFunction);

    await runQueryInWidget(page, "SELECT name, id FROM users");

    // Verify chart container appears
    await expect(page.locator(".widget .chart-container")).toBeVisible();
    await expect(page.locator(".widget svg")).toBeVisible();

    await setupTestCleanup(uploadedFilename);
  });
});
