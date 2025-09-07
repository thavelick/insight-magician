import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth-helper.js";
import { cleanupUploadedFile } from "../helpers/database.js";
import { addWidget, setupDatabaseWithUpload } from "../helpers/integration.js";

test.describe("Widget Confirmation Dialogs", () => {
  let uploadedFilename;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");

    await authenticateUser(page);
    await page.waitForSelector("text=Drop your SQLite database file here");

    const result = await setupDatabaseWithUpload(page);
    uploadedFilename = result.uploadedFilename;
  });

  test.afterEach(async () => {
    await cleanupUploadedFile(uploadedFilename);
    uploadedFilename = null;
  });

  async function setupWidgetWithDialog(page, handler) {
    await addWidget(page);
    await expect(page.locator(".widget")).toHaveCount(1);

    let dialogShown = false;
    let dialogMessage = "";

    page.on("dialog", (dialog) => {
      dialogShown = true;
      dialogMessage = dialog.message();
      handler(dialog);
    });

    return {
      dialogShown: () => dialogShown,
      dialogMessage: () => dialogMessage,
    };
  }

  function getWidgetLocator(page, index = 0) {
    return page.locator(".widget").nth(index);
  }

  test("should show confirmation before deleting widget", async ({ page }) => {
    const dialog = await setupWidgetWithDialog(page, (d) => d.dismiss());
    const widget = getWidgetLocator(page);

    const deleteBtn = widget.locator(".card-back .delete-btn");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    expect(dialog.dialogShown()).toBe(true);
    expect(dialog.dialogMessage()).toBe(
      "Are you sure you want to delete this widget?",
    );
    await expect(page.locator(".widget")).toHaveCount(1);
  });

  test("should warn before switching from graph to table with existing chart function", async ({
    page,
  }) => {
    await addWidget(page);
    await expect(page.locator(".widget")).toHaveCount(1);
    const widget = getWidgetLocator(page);

    await widget.locator(".widget-type-select").selectOption("graph");
    await widget
      .locator(".chart-function-editor")
      .fill("console.log('test chart function');");

    let dialogShown = false;
    let dialogMessage = "";

    page.on("dialog", (dialog) => {
      dialogShown = true;
      dialogMessage = dialog.message();
      dialog.dismiss();
    });

    await widget.locator(".widget-type-select").selectOption("data-table");

    expect(dialogShown).toBe(true);
    expect(dialogMessage).toBe(
      "Switching to Data Table will remove your chart function code. Are you sure?",
    );

    const currentType = await widget
      .locator(".widget-type-select")
      .inputValue();
    expect(currentType).toBe("graph");
  });

  test("should respect user choice in confirmation dialogs", async ({
    page,
  }) => {
    const dialog = await setupWidgetWithDialog(page, (d) => d.accept());
    const widget = getWidgetLocator(page);

    const deleteBtn = widget.locator(".card-back .delete-btn");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.locator(".widget")).toHaveCount(0);
  });
});
