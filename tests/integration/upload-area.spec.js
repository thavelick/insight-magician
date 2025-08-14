import { expect, test } from "@playwright/test";
import { cleanupUploadedFile } from "../helpers/database.js";
import { addWidget, setupDatabaseWithUpload } from "../helpers/integration.js";

test.describe("Upload Area Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Drop your SQLite database file here");
  });

  // Helper function to delete a widget with confirmation
  async function deleteWidget(page, widgetIndex = 0) {
    // Set up dialog handler before clicking delete
    page.on("dialog", (dialog) => dialog.accept());

    // Use force click to avoid animation interference
    await page
      .locator(".widget")
      .nth(widgetIndex)
      .locator(".delete-btn")
      .first()
      .click({ force: true });
  }

  // Helper function to simulate file upload failure
  async function simulateUploadError(page) {
    // Upload an invalid file to trigger error
    const invalidFile = Buffer.from("not a database", "utf8");
    await page.setInputFiles("input[type=file]", {
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: invalidFile,
    });
  }

  // Helper function to verify upload area and toggle button state
  async function verifyUploadAreaState(
    page,
    uploadAreaVisible,
    toggleButtonVisible,
  ) {
    if (uploadAreaVisible) {
      await expect(page.locator(".upload-area")).toBeVisible();
    } else {
      await expect(page.locator(".upload-area")).toBeHidden();
    }

    if (toggleButtonVisible) {
      await expect(page.locator("#toggle-upload")).toBeVisible();
    } else {
      await expect(page.locator("#toggle-upload")).toBeHidden();
    }
  }

  // Helper function for setup with database and widget
  async function setupDatabaseAndWidget(page) {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);
    await addWidget(page);
    return { uploadedFilename };
  }

  test("should hide upload area after adding first widget", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Upload area should be visible initially
    await verifyUploadAreaState(page, true, false);

    // Add first widget
    await addWidget(page);

    // Upload area should be hidden, toggle button should appear
    await verifyUploadAreaState(page, false, true);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should show upload area again when no widgets remain", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseAndWidget(page);

    // Verify widget was added and upload area hidden
    await verifyUploadAreaState(page, false, true);

    // Delete the widget
    await deleteWidget(page);

    // Upload area should reappear, toggle button should disappear
    await verifyUploadAreaState(page, true, false);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should toggle upload area visibility with toggle button", async ({
    page,
  }) => {
    const { uploadedFilename } = await setupDatabaseAndWidget(page);

    // Verify initial state after widget added
    await verifyUploadAreaState(page, false, true);

    // Click toggle button to show upload area
    await page.click("#toggle-upload");
    // When upload area is shown, toggle button should be hidden
    await verifyUploadAreaState(page, true, false);

    // Click upload area to hide it (click the close button)
    await page.click(".upload-area .close-upload");
    // Toggle button should reappear
    await verifyUploadAreaState(page, false, true);

    await cleanupUploadedFile(uploadedFilename);
  });

  test("should display upload success and error messages", async ({ page }) => {
    // Test successful upload message
    const { uploadedFilename } = await setupDatabaseWithUpload(page);

    // Should see success message in upload area
    await expect(page.locator(".upload-status.success")).toBeVisible();
    await expect(page.locator("text=Database loaded")).toBeVisible();
    await expect(page.locator(".upload-another")).toBeVisible();

    // Test "Upload Another" functionality
    await page.click(".upload-another");
    await expect(
      page.locator("text=Drop your SQLite database file here"),
    ).toBeVisible();

    // Test error message by uploading invalid file
    await simulateUploadError(page);
    await expect(page.locator(".upload-status.error")).toBeVisible();
    // Check for generic error message (specific text may vary)
    await expect(page.locator(".upload-status.error p")).toBeVisible();
    await expect(page.locator(".try-again")).toBeVisible();

    // Test "Try Again" functionality
    await page.click(".try-again");
    await expect(
      page.locator("text=Drop your SQLite database file here"),
    ).toBeVisible();

    await cleanupUploadedFile(uploadedFilename);
  });
});
