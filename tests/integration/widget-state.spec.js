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

  // Helper function to upload database
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

  test("should create and delete widgets properly", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Initially no widgets
    await expect(page.locator(".widget")).toHaveCount(0);

    // Add first widget
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toHaveCount(1);

    // Add second widget
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget")).toHaveCount(2);

    // Wait for widgets to finish their flip animation (widgets start by flipping to edit mode)
    await page.waitForTimeout(500);

    // Set up dialog handler for all deletions
    page.on('dialog', dialog => dialog.accept());
    
    // Delete first widget
    await page.locator(".widget").nth(0).locator(".card-back .delete-btn").click({ force: true });
    await expect(page.locator(".widget")).toHaveCount(1);

    // Delete last widget
    await page.locator(".widget").nth(0).locator(".card-back .delete-btn").click({ force: true });
    await expect(page.locator(".widget")).toHaveCount(0);

    // Upload area should be visible again (wait for it to appear)
    await expect(page.locator(".upload-area")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should flip between edit and view modes correctly", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Add widget (starts in edit mode)
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    // Fill in query and set up response listener before clicking
    await page.fill(".widget .query-editor", "SELECT name, email FROM users WHERE name LIKE 'A%'");
    
    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    await page.click(".widget .run-view-btn");
    await queryResponsePromise;

    // Should now be in view mode showing results
    await expect(page.locator(".widget .results-table")).toBeVisible();
    await expect(page.locator(".widget .edit-btn")).toBeVisible();

    // Click edit to flip back
    await page.click(".widget .edit-btn");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should persist selected database across page reload", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Verify database is loaded
    await expect(page.locator("button:has-text('View Schema')")).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Database should still be selected (from sessionStorage)
    await expect(page.locator("button:has-text('View Schema')")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should execute queries through widget interface", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Add widget
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    // Enter query
    await page.fill(".widget .query-editor", "SELECT name, email FROM users WHERE name LIKE 'A%'");

    // Execute query
    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    await page.click(".widget .run-view-btn");
    const queryResponse = await queryResponsePromise;

    // Verify query executed successfully
    expect(queryResponse.status()).toBe(200);
    const queryBody = await queryResponse.json();
    expect(queryBody.success).toBe(true);
    expect(queryBody.columns).toEqual(["name", "email"]);

    // Verify UI shows results
    await expect(page.locator(".widget .results-table")).toBeVisible();
    await expect(page.locator("text=Alice Johnson")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should render basic chart for graph widgets", async ({ page }) => {
    const { uploadedFilename } = await setupDatabase(page);

    // Add widget
    await page.click("button:has-text('Add Widget')");
    await expect(page.locator(".widget .query-editor")).toBeVisible();

    // Switch to graph widget type
    await page.selectOption(".widget .widget-type-select", "graph");

    // Enter query
    await page.fill(".widget .query-editor", "SELECT name, id FROM users");

    // Add simple chart function
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

    // Execute query - set up listener before clicking
    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );

    await page.click(".widget .run-view-btn");
    await queryResponsePromise;

    // Verify chart container appears
    await expect(page.locator(".widget .chart-container")).toBeVisible();
    await expect(page.locator(".widget svg")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });
});