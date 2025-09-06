import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  addWidget,
  reloadAndWait,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("Widget Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    // Authenticate user since endpoints now require auth
    await authenticateUser(page);
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper function to run a query in graph widget and wait for chart
  async function runGraphQuery(page, query) {
    await page.fill(".widget .query-editor", query);

    const queryResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/query"),
    );
    await page.click(".widget .run-view-btn");
    await queryResponsePromise;
  }

  // Helper function to set up a graph widget with chart function
  async function setupGraphWidget(page, title, chartFunction) {
    await page.fill(".widget .widget-title-input", title);
    await page.selectOption(".widget .widget-type-select", "graph");
    await page.fill(".widget .chart-function-editor", chartFunction);
  }

  test("should update widget title and display in header", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await addWidget(page);

    // Widget should start with default title
    await expect(page.locator(".widget .card-front h4")).toContainText(
      "Query Results",
    );
    await expect(page.locator(".widget .back-panel-title")).toContainText(
      "Widget Settings",
    );

    const customTitle = "User Analytics Dashboard";
    await page.fill(".widget .widget-title-input", customTitle);

    // Headers should update immediately
    await expect(page.locator(".widget .card-front h4")).toContainText(
      customTitle,
    );
    await expect(page.locator(".widget .back-panel-title")).toContainText(
      `${customTitle} Widget Settings`,
    );

    // Test fallback when title is cleared
    await page.fill(".widget .widget-title-input", "");
    await expect(page.locator(".widget .card-front h4")).toContainText(
      "Query Results",
    );
    await expect(page.locator(".widget .back-panel-title")).toContainText(
      "Widget Settings",
    );

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should switch between data table and graph widget types", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await addWidget(page);

    // Should start as data-table type
    await expect(page.locator(".widget .widget-type-select")).toHaveValue(
      "data-table",
    );
    await expect(page.locator(".widget .chart-function-group")).toBeHidden();

    // Switch to graph type
    await page.selectOption(".widget .widget-type-select", "graph");
    await expect(page.locator(".widget .widget-type-select")).toHaveValue(
      "graph",
    );
    await expect(page.locator(".widget .chart-function-group")).toBeVisible();

    // Switch back to data-table (no chart function yet, so no confirmation)
    await page.selectOption(".widget .widget-type-select", "data-table");
    await expect(page.locator(".widget .widget-type-select")).toHaveValue(
      "data-table",
    );
    await expect(page.locator(".widget .chart-function-group")).toBeHidden();

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should show chart function input only for graph widgets", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await addWidget(page);

    // Initially data-table: chart function should be hidden
    await expect(page.locator(".widget .chart-function-group")).toBeHidden();
    await expect(
      page.locator(".widget .chart-function-editor"),
    ).not.toBeVisible();

    // Switch to graph: chart function should appear
    await page.selectOption(".widget .widget-type-select", "graph");
    await expect(page.locator(".widget .chart-function-group")).toBeVisible();
    await expect(page.locator(".widget .chart-function-editor")).toBeVisible();

    // Add some chart function code
    const chartFunction = `
function createChart(data, svg, d3, width, height) {
  svg.append('circle').attr('cx', 50).attr('cy', 50).attr('r', 20);
  return svg;
}`;
    await page.fill(".widget .chart-function-editor", chartFunction);

    // Set up dialog handler for confirmation
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain(
        "Switching to Data Table will remove your chart function code",
      );
      dialog.accept();
    });

    // Switch back to data-table: should prompt for confirmation
    await page.selectOption(".widget .widget-type-select", "data-table");
    await expect(page.locator(".widget .chart-function-group")).toBeHidden();

    // Chart function should be cleared after confirmation
    await page.selectOption(".widget .widget-type-select", "graph");
    await expect(page.locator(".widget .chart-function-editor")).toHaveValue(
      "",
    );

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should persist widget configuration across sessions", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    await addWidget(page);

    // Configure widget with custom settings
    const customTitle = "Sales Report Widget";
    const chartFunction = `
function createChart(data, svg, d3, width, height) {
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .text('Sales Chart')
    .attr('text-anchor', 'middle');
  return svg;
}`;

    await setupGraphWidget(page, customTitle, chartFunction);

    // Trigger save by running a query
    await runGraphQuery(page, "SELECT name, id FROM users");
    await expect(page.locator(".widget .chart-container")).toBeVisible();

    // Reload page and verify persistence
    await reloadAndWait(page);

    // Configuration should be restored
    await expect(page.locator(".widget .card-front h4")).toContainText(
      customTitle,
    );
    await expect(page.locator(".widget .widget-title-input")).toHaveValue(
      customTitle,
    );
    await expect(page.locator(".widget .widget-type-select")).toHaveValue(
      "graph",
    );
    await expect(page.locator(".widget .chart-function-group")).toBeVisible();
    await expect(page.locator(".widget .chart-function-editor")).toHaveValue(
      chartFunction,
    );

    // Query and results should also be restored
    await expect(page.locator(".widget .query-editor")).toHaveValue(
      "SELECT name, id FROM users",
    );
    await expect(page.locator(".widget .chart-container")).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });
});
