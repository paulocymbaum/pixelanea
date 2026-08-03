import { expect, test } from "@playwright/test";
import path from "node:path";
import {
  addShadowUnderSubject,
  animateHorizontalWalk,
  copyCurrentSelection,
  createBlankProject,
  dismissOnboarding,
  duplicateToEightBlankFrames,
  E2E_SAVE_PATH,
  LINKEDIN_MEDIA_DIR,
  mockProjectPicker,
  pause,
  playAnimationPreview,
  prepareCanvasView,
  prepareEditorForPaint,
  paintStroke,
  runCapybaraImport,
  saveProjectToPath,
  selectFrame,
  selectSubjectRegion,
} from "./linkedin-media.helpers";

const MEDIA_BASENAMES = {
  blank: "video-01-blank-project",
  import: "video-02-import-image",
  animation: "video-03-animation",
  onboarding: "still-01-onboarding-tutorial",
} as const;

test.describe("LinkedIn media capture", () => {
  test("video-01-blank-project — new canvas, tour, paint, save", async ({
    page,
  }) => {
    await mockProjectPicker(page, { save: E2E_SAVE_PATH });
    await page.goto("/");
    await pause(page, 800);
    await page.getByRole("button", { name: "Start blank" }).click();
    await pause(page, 500);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
    await pause(page, 600);

    await expect(page.getByRole("heading", { name: "Pick a color" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await pause(page, 500);
    await page.getByRole("button", { name: "Next" }).click();
    await pause(page, 500);
    await page.getByRole("button", { name: "Skip tour" }).click();

    await prepareCanvasView(page);
    await prepareEditorForPaint(page);
    await paintStroke(page);
    await pause(page, 400);
    await saveProjectToPath(page, E2E_SAVE_PATH);
    await expect(page.getByText("Project saved.")).toBeVisible({ timeout: 15_000 });
    await pause(page, 1200);
  });

  test("video-02-import-image — capybara photo through import wizard", async ({
    page,
  }) => {
    await runCapybaraImport(page);
    await prepareCanvasView(page);
    await pause(page, 1500);
  });

  test("video-03-animation — shadows, select, frame-by-frame walk, play", async ({
    page,
  }) => {
    await runCapybaraImport(page);
    await prepareCanvasView(page);
    await addShadowUnderSubject(page);
    await duplicateToEightBlankFrames(page);

    await selectFrame(page, 1);
    await selectSubjectRegion(page);
    await copyCurrentSelection(page);

    await animateHorizontalWalk(page, 8);
    await playAnimationPreview(page);
    await pause(page, 1000);
  });

  test("still-01-onboarding-tutorial — first tour step screenshot", async ({
    page,
  }) => {
    await createBlankProject(page, { keepOnboarding: true });
    await expect(page.getByRole("heading", { name: "Pick a color" })).toBeVisible();
    await pause(page, 400);
    await page.screenshot({
      path: path.join(LINKEDIN_MEDIA_DIR, `${MEDIA_BASENAMES.onboarding}.png`),
      fullPage: false,
    });
  });
});
