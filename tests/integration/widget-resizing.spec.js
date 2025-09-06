import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import {
  addWidget,
  reloadAndWait,
  setupDatabaseWithUpload,
} from "../helpers/integration.js";

test.describe("Widget Resizing Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    await authenticateUser(page);
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper functions for widget resizing tests

  async function getWidgetSize(page, widgetIndex = 0) {
    const widget = page.locator(".widget").nth(widgetIndex);
    const gridColumn = await widget.evaluate((el) => el.style.gridColumn);
    const gridRow = await widget.evaluate((el) => el.style.gridRow);

    // Extract numbers from "span X" format
    const width = Number.parseInt(gridColumn.replace("span ", ""));
    const height = Number.parseInt(gridRow.replace("span ", ""));

    return { width, height };
  }

  async function clickResizeButton(page, direction, widgetIndex = 0) {
    const widget = page.locator(".widget").nth(widgetIndex);
    await widget.locator(`.${direction}`).click();
  }

  async function isResizeButtonVisible(page, direction, widgetIndex = 0) {
    const widget = page.locator(".widget").nth(widgetIndex);
    const button = widget.locator(`.${direction}`);
    return await button.isVisible();
  }

  test("should increase and decrease widget width within limits", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);

    let size = await getWidgetSize(page);
    expect(size.width).toBe(2);
    expect(size.height).toBe(2);

    // Test increasing width to maximum
    await clickResizeButton(page, "width-plus");
    size = await getWidgetSize(page);
    expect(size.width).toBe(3);

    await clickResizeButton(page, "width-plus");
    size = await getWidgetSize(page);
    expect(size.width).toBe(4);

    // Test decreasing width back down
    await clickResizeButton(page, "width-minus");
    size = await getWidgetSize(page);
    expect(size.width).toBe(3);

    await clickResizeButton(page, "width-minus");
    size = await getWidgetSize(page);
    expect(size.width).toBe(2);

    await clickResizeButton(page, "width-minus");
    size = await getWidgetSize(page);
    expect(size.width).toBe(1);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should increase and decrease widget height within limits", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);

    let size = await getWidgetSize(page);
    expect(size.width).toBe(2);
    expect(size.height).toBe(2);

    // Test increasing height to maximum
    await clickResizeButton(page, "height-plus");
    size = await getWidgetSize(page);
    expect(size.height).toBe(3);

    await clickResizeButton(page, "height-plus");
    size = await getWidgetSize(page);
    expect(size.height).toBe(4);

    // Test decreasing height back down
    await clickResizeButton(page, "height-minus");
    size = await getWidgetSize(page);
    expect(size.height).toBe(3);

    await clickResizeButton(page, "height-minus");
    size = await getWidgetSize(page);
    expect(size.height).toBe(2);

    await clickResizeButton(page, "height-minus");
    size = await getWidgetSize(page);
    expect(size.height).toBe(1);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should hide resize buttons at size limits", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);

    // At default size (2x2), all buttons should be visible
    expect(await isResizeButtonVisible(page, "width-plus")).toBe(true);
    expect(await isResizeButtonVisible(page, "width-minus")).toBe(true);
    expect(await isResizeButtonVisible(page, "height-plus")).toBe(true);
    expect(await isResizeButtonVisible(page, "height-minus")).toBe(true);

    // Increase width to maximum (4)
    await clickResizeButton(page, "width-plus");
    await clickResizeButton(page, "width-plus");

    // width-plus button should be hidden at maximum
    expect(await isResizeButtonVisible(page, "width-plus")).toBe(false);
    expect(await isResizeButtonVisible(page, "width-minus")).toBe(true);

    // Decrease width to minimum (1)
    await clickResizeButton(page, "width-minus");
    await clickResizeButton(page, "width-minus");
    await clickResizeButton(page, "width-minus");

    // width-minus button should be hidden at minimum
    expect(await isResizeButtonVisible(page, "width-minus")).toBe(false);
    expect(await isResizeButtonVisible(page, "width-plus")).toBe(true);

    // Reset width to 2 for height testing
    await clickResizeButton(page, "width-plus");

    // Increase height to maximum (4)
    await clickResizeButton(page, "height-plus");
    await clickResizeButton(page, "height-plus");

    // height-plus button should be hidden at maximum
    expect(await isResizeButtonVisible(page, "height-plus")).toBe(false);
    expect(await isResizeButtonVisible(page, "height-minus")).toBe(true);

    // Decrease height to minimum (1)
    await clickResizeButton(page, "height-minus");
    await clickResizeButton(page, "height-minus");
    await clickResizeButton(page, "height-minus");

    // height-minus button should be hidden at minimum
    expect(await isResizeButtonVisible(page, "height-minus")).toBe(false);
    expect(await isResizeButtonVisible(page, "height-plus")).toBe(true);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should show visual feedback when size changes", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);

    // Click width+ and look for size feedback
    await clickResizeButton(page, "width-plus");

    // Should show size feedback overlay
    await expect(page.locator(".size-feedback")).toBeVisible();
    await expect(page.locator(".size-feedback")).toHaveText("3×2");

    // Feedback should disappear after animation completes (1200ms timeout in widget.js)
    await page.waitForSelector(".size-feedback", { state: "hidden" });

    // Test height feedback
    await clickResizeButton(page, "height-plus");
    await expect(page.locator(".size-feedback")).toBeVisible();
    await expect(page.locator(".size-feedback")).toHaveText("3×3");

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should persist widget sizes after page reload", async ({ page }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);

    // Change widget size
    await clickResizeButton(page, "width-plus"); // 3x2
    await clickResizeButton(page, "height-plus"); // 3x3

    // Verify size before reload
    let size = await getWidgetSize(page);
    expect(size.width).toBe(3);
    expect(size.height).toBe(3);

    // Reload page
    await reloadAndWait(page);

    // Widget should still exist with the same size
    await expect(page.locator(".widget")).toHaveCount(1);
    size = await getWidgetSize(page);
    expect(size.width).toBe(3);
    expect(size.height).toBe(3);

    // Resize buttons should still work correctly after reload
    await clickResizeButton(page, "width-minus"); // 2x3
    size = await getWidgetSize(page);
    expect(size.width).toBe(2);
    expect(size.height).toBe(3);

    await cleanupUploadedFile(uploadedFilename);
  });
});
