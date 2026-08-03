import { expect, test } from "@playwright/test";
import {
  clickFileMenuItem,
  completeFallbackProjectPathIfShown,
  confirmOverwriteIfShown,
  createBlankProject,
  E2E_SAVE_PATH,
  expectAllChangesSaved,
  mockProjectPicker,
  openProjectFromLanding,
  paintStroke,
} from "./helpers";

test.describe("@routing", () => {
  test("Paint → New → confirm → Cancel → still editor", async ({ page }) => {
    await createBlankProject(page);
    await paintStroke(page);
    await expect(page.getByRole("status")).toContainText("Unsaved changes", {
      timeout: 10_000,
    });

    await clickFileMenuItem(page, "New");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a new project" })).toHaveCount(
      0,
    );
  });

  test("Paint → Open → confirm → Cancel", async ({ page }) => {
    await mockProjectPicker(page);
    await createBlankProject(page);
    await paintStroke(page);
    await expect(page.getByRole("status")).toContainText("Unsaved changes", {
      timeout: 10_000,
    });

    await clickFileMenuItem(page, "Open");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible();
  });

  test("Clean → New → no dialog", async ({ page }) => {
    await createBlankProject(page);

    await clickFileMenuItem(page, "New");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Start a new project" })).toBeVisible();
  });

  test("Paint → Import → Save, then continue → wizard opens with work saved", async ({
    page,
  }) => {
    await mockProjectPicker(page, { save: E2E_SAVE_PATH, open: E2E_SAVE_PATH });
    await createBlankProject(page);
    await paintStroke(page);
    await expect(page.getByRole("status")).toContainText(/Unsaved changes|Not saved to file/, {
      timeout: 10_000,
    });

    await clickFileMenuItem(page, "Import image");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save, then continue" }),
    ).toBeVisible();

    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/projects\/[^/]+\/save$/.test(response.url()) &&
        response.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Save, then continue" }).click();
    await completeFallbackProjectPathIfShown(page, {
      path: E2E_SAVE_PATH,
      mode: "saveAs",
    });
    await confirmOverwriteIfShown(page);
    await saveResponse;

    await expect(page.getByRole("heading", { name: "Import image" })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/");
    await openProjectFromLanding(page);
    await expectAllChangesSaved(page);
    await expect(page.getByLabel("Pixel canvas")).toBeVisible();
  });
});
