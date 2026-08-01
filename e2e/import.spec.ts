import { expect, test } from "@playwright/test";
import {
  acceptImportPreview,
  advanceImportToPreview,
  getFramePixels,
  openImportWizard,
  SAMPLE_ALPHA_IMAGE,
  SAMPLE_IMAGE,
} from "./helpers";

test.describe("@error @import", () => {
  test("unsupported file rejected then PNG accepted (QA-002:ERR-001, MVP:ERR-002)", async ({
    page,
  }) => {
    await openImportWizard(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });

    await expect(page.getByRole("alert")).toHaveText("Use a PNG, JPEG, or BMP image.");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    await page.locator('input[type="file"]').setInputFiles(SAMPLE_IMAGE);
    await expect(page.getByText("sample.png")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});

test.describe("@edge @import", () => {
  test("RGBA PNG keeps transparent pixels after import (QA-002:EDGE-003)", async ({ page }) => {
    await openImportWizard(page);
    await advanceImportToPreview(page, SAMPLE_ALPHA_IMAGE, "sample-alpha.png");
    const projectId = await acceptImportPreview(page);

    const pixels = await getFramePixels(page, projectId, 0);
    const transparentCount = pixels.filter((value) => value === 0).length;
    const paintedCount = pixels.filter((value) => value !== 0).length;

    expect(transparentCount).toBeGreaterThan(0);
    expect(paintedCount).toBeGreaterThan(0);
    expect(pixels[0]).toBe(0);
    expect(pixels[pixels.length - 1]).toBe(0);
  });
});
