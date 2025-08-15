import { expect, test } from "@playwright/test";
import {
  expectChartFunctionError,
  runChartFunction,
  setupGraphWidget,
} from "../helpers/integration.js";

test.describe("Chart Function Validation", () => {
  test.beforeEach(async ({ page }) => {
    await setupGraphWidget(page, "basic");
  });

  test("should validate JavaScript syntax in chart functions", async ({
    page,
  }) => {
    const validFunction = `function createChart(data, svg, d3, width, height) {
      const circle = svg.append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', 50)
        .attr('fill', 'blue');
      return svg;
    }`;

    await runChartFunction(page, validFunction, "SELECT 1 as test");

    await expect(page.locator(".chart-container")).toBeVisible();

    const invalidFunction = `function createChart(data, svg, d3, width, height) {
      const circle = svg.append('circle'
        .attr('cx', width / 2
        .attr('cy', height / 2)
        .attr('r', 50)
        .attr('fill', 'blue');
      return svg;
    }`;

    await expectChartFunctionError(
      page,
      invalidFunction,
      "JavaScript syntax error",
    );
  });

  test("should reject dangerous patterns like while loops", async ({
    page,
  }) => {
    const whileLoopFunction = `function createChart(data, svg, d3, width, height) {
      while (true) {
        console.log("infinite loop");
      }
      return svg;
    }`;

    await expectChartFunctionError(
      page,
      whileLoopFunction,
      "while loops are not allowed",
    );

    const forLoopFunction = `function createChart(data, svg, d3, width, height) {
      for (;;) {
        console.log("infinite loop");
      }
      return svg;
    }`;

    await expectChartFunctionError(page, forLoopFunction, "infinite for loops");

    const doWhileFunction = `function createChart(data, svg, d3, width, height) {
      do {
        console.log("potential infinite loop");
      } while (true);
      return svg;
    }`;

    await expectChartFunctionError(
      page,
      doWhileFunction,
      "do-while loops are not allowed",
    );
  });

  test("should show helpful error messages when chart function fails", async ({
    page,
  }) => {
    const errorFunction = `function createChart(data, svg, d3, width, height) {
      throw new Error("Custom chart error for testing");
    }`;

    await runChartFunction(page, errorFunction, "SELECT 1 as test, 2 as value");

    await expect(page.locator(".card-inner")).not.toHaveClass("flipped");

    await expect(page.locator(".error-state")).toBeVisible();
    await expect(page.locator('h5:has-text("⚠️ Chart Error")')).toBeVisible();
    await expect(
      page.locator('.error-message:has-text("Custom chart error for testing")'),
    ).toBeVisible();

    await expect(page.locator("details.error-details")).toBeVisible();

    await expect(
      page.locator('.help-section:has-text("💡 Tips:")'),
    ).toBeVisible();
    await expect(
      page.locator('li:has-text("Make sure your function returns an SVG")'),
    ).toBeVisible();

    const invalidReturnFunction = `function createChart(data, svg, d3, width, height) {
      return "not a DOM element";
    }`;

    await page.click(".edit-btn");
    await runChartFunction(
      page,
      invalidReturnFunction,
      "SELECT 1 as test, 2 as value",
    );

    await expect(
      page.locator(
        '.error-message:has-text("Chart function must return a DOM element")',
      ),
    ).toBeVisible();
  });

  test("should display data preview when chart rendering fails", async ({
    page,
  }) => {
    const errorFunction = `function createChart(data, svg, d3, width, height) {
      throw new Error("Chart rendering failed");
    }`;

    await runChartFunction(
      page,
      errorFunction,
      "SELECT 1 as id, 'test' as name, 42 as value",
    );

    await expect(page.locator(".error-state")).toBeVisible();

    await expect(
      page.locator('.data-preview-section:has-text("📊 Data Preview")'),
    ).toBeVisible();

    await expect(page.locator(".data-preview-table")).toBeVisible();
    await expect(page.locator("th:has-text('id')")).toBeVisible();
    await expect(page.locator("th:has-text('name')")).toBeVisible();
    await expect(page.locator("th:has-text('value')")).toBeVisible();

    await expect(page.locator("td:has-text('1')")).toBeVisible();
    await expect(page.locator("td:has-text('test')")).toBeVisible();
    await expect(page.locator("td:has-text('42')")).toBeVisible();

    const multiRowQuery = `SELECT 
      id, 
      'name_' || id as name, 
      id * 10 as value 
    FROM (
      SELECT 1 as id UNION ALL 
      SELECT 2 UNION ALL 
      SELECT 3 UNION ALL 
      SELECT 4 UNION ALL 
      SELECT 5 UNION ALL
      SELECT 6 UNION ALL
      SELECT 7
    )`;

    await page.click(".edit-btn");
    await runChartFunction(page, errorFunction, multiRowQuery);

    await expect(page.locator(".data-preview-table tbody tr")).toHaveCount(5);
    await expect(
      page.locator('.data-preview-row-count:has-text("Showing 5 of 7 rows")'),
    ).toBeVisible();
  });
});
