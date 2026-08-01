import { expect, test } from "@playwright/test";
import {
  clickFileMenuItem,
  closeProjectSession,
  confirmOverwriteIfShown,
  createBlankProject,
  dismissOnboarding,
  E2E_SAVE_BASENAME,
  E2E_SAVE_PATH,
  enterEditorAfterReload,
  getFramePixels,
  mockProjectPicker,
  paintFrame2Mark,
  paintStroke,
  runImportWizard,
  selectFrame,
  waitForFramePut,
} from "./helpers";

test.describe("@smoke", () => {
  test("Riley: blank → paint → duplicate 8 → save → reload → open round-trip", async ({
    page,
  }) => {
    await mockProjectPicker(page, { save: E2E_SAVE_PATH, open: E2E_SAVE_PATH });
    await createBlankProject(page);

    const frame1Put = waitForFramePut(page);
    await paintStroke(page);
    await frame1Put;

    await page.getByRole("button", { name: "Duplicate frames" }).click();
    const duplicateDialog = page.getByRole("dialog", { name: "Duplicate frames" });
    await expect(duplicateDialog).toBeVisible();
    const duplicateResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/projects\/[^/]+\/frames\/duplicate$/.test(response.url()) &&
        response.ok(),
      { timeout: 30_000 },
    );
    await duplicateDialog.getByRole("button", { name: "Duplicate frames" }).click();
    await duplicateResponse;

    await expect(page.getByRole("button", { name: "Frame 8" })).toBeVisible({
      timeout: 15_000,
    });

    await selectFrame(page, 2);
    const frame2Put = waitForFramePut(page);
    await paintFrame2Mark(page);
    await frame2Put;

    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/projects\/[^/]+\/save$/.test(response.url()) &&
        response.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await confirmOverwriteIfShown(page);
    const saved = await saveResponse;
    const projectId = saved.url().match(/\/api\/projects\/([^/]+)\/save/)?.[1];
    expect(projectId).toBeTruthy();

    await expect(page.getByText("Project saved.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_SAVE_BASENAME)).toBeVisible();

    await closeProjectSession(page, projectId!);
    await enterEditorAfterReload(page);
    await mockProjectPicker(page, { save: E2E_SAVE_PATH, open: E2E_SAVE_PATH });

    const projectLoad = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        /\/api\/projects\/[^/]+$/.test(response.url()) &&
        response.ok(),
      { timeout: 30_000 },
    );
    await clickFileMenuItem(page, "Open");
    const loadedProject = await (await projectLoad).json();
    expect(loadedProject.frameCount).toBe(8);
    expect(loadedProject.assetType).toBe("character");

    await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
    await dismissOnboarding(page);
    await expect(page.getByText(E2E_SAVE_BASENAME)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Frame 8" })).toBeVisible({
      timeout: 15_000,
    });

    await selectFrame(page, 1);
    const frame1Pixels = await getFramePixels(page, loadedProject.id, 0);
    const frame2Pixels = await getFramePixels(page, loadedProject.id, 1);
    expect(frame1Pixels.some((value) => value !== 0)).toBe(true);
    expect(frame2Pixels.some((value) => value !== 0)).toBe(true);
    expect(frame2Pixels).not.toEqual(frame1Pixels);
  });

  test("Casey: import wizard happy path", async ({ page }) => {
    await runImportWizard(page);
    await expect(page.getByRole("banner")).toContainText("Imported project");
  });

  test("Paint click-drag complements vitest golden path", async ({ page }) => {
    await createBlankProject(page);

    const putFrame = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        /\/api\/projects\/[^/]+\/frames\/\d+/.test(response.url()) &&
        response.ok(),
      { timeout: 15_000 },
    );
    await paintStroke(page);
    await putFrame;
    await expect(page.getByRole("status")).toContainText("All changes saved", {
      timeout: 15_000,
    });
  });
});
