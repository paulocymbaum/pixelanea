import { expect, test } from "@playwright/test";
import {
  advanceImportToPreview,
  openImportWizard,
  paintStroke,
  SAMPLE_IMAGE,
  waitForFramePut,
} from "./helpers";

test.describe("@onboarding", () => {
  test("import wizard never shows onboarding overlay (QA-002:HP-006)", async ({ page }) => {
    await openImportWizard(page);
    await expect(page.getByText("Pick a color")).toHaveCount(0);

    await advanceImportToPreview(page, SAMPLE_IMAGE, "sample.png");
    await expect(page.getByText("Pick a color")).toHaveCount(0);
  });

  test("blank project skip tour dismisses overlay and allows paint (QA-002:HP-006)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start blank" }).click();
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Pick a color")).toBeVisible();
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByText("Pick a color")).toHaveCount(0);

    const putFrame = waitForFramePut(page);
    await paintStroke(page);
    await putFrame;
    await expect(page.getByRole("status")).toContainText("All changes saved", {
      timeout: 15_000,
    });
  });
});
