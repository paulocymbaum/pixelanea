import { expect, test } from "@playwright/test";
import {
  clickFileMenuItem,
  closeProjectSession,
  createBlankProject,
  dismissOnboarding,
  E2E_SAVE_BASENAME,
  E2E_SAVE_PATH,
  enterEditorAfterReload,
  getFramePixels,
  mockProjectPicker,
  paintStroke,
  runImportWizard,
  saveProjectToPath,
  selectFrame,
  waitForFrameSync,
  waitForFramesReload,
} from "./helpers";

test.describe("@smoke", () => {
  test("Riley: blank → paint → duplicate 8 → save → reload → open round-trip", async ({
    page,
  }) => {
    await mockProjectPicker(page, { save: E2E_SAVE_PATH, open: E2E_SAVE_PATH });
    const projectId = await createBlankProject(page);

    const frame1Sync = waitForFrameSync(page);
    await paintStroke(page);
    await frame1Sync;

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
    const reloadDone = waitForFramesReload(page, 7);
    await duplicateDialog.getByRole("button", { name: "Blank other frames" }).click();
    await duplicateDialog.getByRole("button", { name: "Duplicate frames" }).click();
    await duplicateResponse;
    await reloadDone;
    await expect(duplicateDialog).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: "Frame 8" })).toBeVisible({
      timeout: 15_000,
    });

    await selectFrame(page, 2);
    const patchResponse = await page.request.patch(
      `/api/projects/${projectId}/frames/1/cells`,
      {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify([{ x: 0, y: 0, previous: 0, next: 1 }]),
      },
    );
    expect(patchResponse.ok()).toBeTruthy();

    const saved = await saveProjectToPath(page, E2E_SAVE_PATH);
    const savedProjectId = saved.url().match(/\/api\/projects\/([^/]+)\/save/)?.[1];
    expect(savedProjectId).toBe(projectId);

    await expect(page.getByText("Project saved.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_SAVE_BASENAME)).toBeVisible();

    await closeProjectSession(page, projectId);
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

    const frameSync = waitForFrameSync(page);
    await paintStroke(page);
    await frameSync;
    await expect(page.getByRole("status")).toContainText("All changes saved", {
      timeout: 15_000,
    });
  });
});
