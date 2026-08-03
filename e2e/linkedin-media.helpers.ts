import { expect, type Page } from "@playwright/test";
import path from "node:path";
import {
  acceptImportPreview,
  createBlankProject,
  dismissOnboarding,
  mockProjectPicker,
  openImportWizard,
  paintStroke,
  prepareEditorForPaint,
  saveProjectToPath,
  selectFrame,
  selectPaletteSection,
  waitForFrameSync,
  clickFileMenuItem,
  E2E_SAVE_PATH,
} from "./helpers";

export const CAPYBARA_IMAGE = path.join(
  process.cwd(),
  "docs",
  "media",
  "linkedin",
  "fixtures",
  "capybara-abbey-road.png",
);

export const CAPYBARA_FILE_NAME = "capybara-abbey-road.png";

export const LINKEDIN_MEDIA_DIR = path.join(
  process.cwd(),
  "docs",
  "media",
  "linkedin",
);

export async function pause(page: Page, ms = 400): Promise<void> {
  await page.waitForTimeout(ms);
}

async function paintDragOnCanvas(
  page: Page,
  start: { xRatio: number; yRatio: number },
  end: { xRatio: number; yRatio: number },
): Promise<void> {
  const canvas = page.getByLabel("Pixel canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Pixel canvas bounding box not found");
  }

  const startX = box.x + box.width * start.xRatio;
  const startY = box.y + box.height * start.yRatio;
  const endX = box.x + box.width * end.xRatio;
  const endY = box.y + box.height * end.yRatio;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 8 });
  await page.mouse.up();
}

export async function runCapybaraImport(page: Page): Promise<void> {
  await openImportWizard(page);
  await page.locator('input[type="file"]').setInputFiles(CAPYBARA_IMAGE);
  await expect(page.getByText(CAPYBARA_FILE_NAME)).toBeVisible({ timeout: 15_000 });
  await pause(page, 700);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Detail" }).click();
  await pause(page, 500);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Retro" }).click();
  await pause(page, 500);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Use this result" })).toBeEnabled({
    timeout: 90_000,
  });
  await pause(page, 1200);
  await acceptImportPreview(page);
  await dismissOnboarding(page);
}

export async function prepareCanvasView(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fit canvas to view" }).click();
  await pause(page, 300);
}

export async function focusCanvas(
  page: Page,
  xRatio = 0.5,
  yRatio = 0.5,
): Promise<void> {
  const canvas = page.getByLabel("Pixel canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Pixel canvas bounding box not found");
  }
  await page.mouse.click(
    box.x + box.width * xRatio,
    box.y + box.height * yRatio,
  );
  await pause(page, 150);
}

export async function addShadowUnderSubject(page: Page): Promise<void> {
  await selectPaletteSection(page, "shading");
  await page.getByRole("tab", { name: "Dark" }).click();
  await pause(page, 300);

  const shades = page.getByRole("listbox", { name: "Generated shades" });
  await shades.getByRole("option").last().click();
  await pause(page, 200);

  await page.keyboard.press("b");
  await paintDragOnCanvas(
    page,
    { xRatio: 0.28, yRatio: 0.62 },
    { xRatio: 0.72, yRatio: 0.68 },
  );
  await paintDragOnCanvas(
    page,
    { xRatio: 0.32, yRatio: 0.7 },
    { xRatio: 0.68, yRatio: 0.76 },
  );
  await pause(page, 500);
}

export async function selectSubjectRegion(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await pause(page, 200);
  await paintDragOnCanvas(
    page,
    { xRatio: 0.12, yRatio: 0.12 },
    { xRatio: 0.88, yRatio: 0.88 },
  );
  await pause(page, 500);
}

export async function copyCurrentSelection(page: Page): Promise<void> {
  await focusCanvas(page, 0.5, 0.45);
  await page.keyboard.press("Control+c");
  await expect(page.getByText("Copied.")).toBeVisible({ timeout: 5_000 });
  await pause(page, 300);
}

export async function pasteWithHorizontalNudge(
  page: Page,
  cellsRight: number,
): Promise<void> {
  await focusCanvas(page, 0.35, 0.5);
  await page.keyboard.press("Control+v");
  await expect(page.getByText("Arrow keys to nudge")).toBeVisible({
    timeout: 5_000,
  });
  await pause(page, 200);
  for (let step = 0; step < cellsRight; step += 1) {
    await page.keyboard.press("ArrowRight");
    await pause(page, 60);
  }
  const sync = waitForFrameSync(page);
  await page.keyboard.press("Enter");
  await sync;
  await pause(page, 350);
}

export async function duplicateToEightBlankFrames(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Add frames for animation" }).click();
  await expect(
    page.getByRole("heading", { name: "Duplicate frames" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Blank other frames" }).click();
  await page.getByRole("button", { name: "8 frames" }).click();

  const duplicateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/projects\/[^/]+\/frames\/duplicate$/.test(response.url()) &&
      response.ok(),
    { timeout: 30_000 },
  );

  await page.getByRole("button", { name: "Duplicate frames" }).click();
  await duplicateResponse;
  await expect(page.getByRole("button", { name: "Frame 8" })).toBeVisible({
    timeout: 20_000,
  });
  await pause(page, 500);
}

export async function animateHorizontalWalk(page: Page, frameCount = 8): Promise<void> {
  for (let frame = 2; frame <= frameCount; frame += 1) {
    await selectFrame(page, frame);
    await pasteWithHorizontalNudge(page, frame - 1);
  }
}

export async function playAnimationPreview(page: Page): Promise<void> {
  await selectFrame(page, 1);
  await page.getByRole("button", { name: "Play animation" }).click();
  await pause(page, 2500);
  await page.getByRole("button", { name: "Pause animation" }).click();
  await pause(page, 400);
}

export {
  createBlankProject,
  dismissOnboarding,
  mockProjectPicker,
  paintStroke,
  prepareEditorForPaint,
  saveProjectToPath,
  selectFrame,
  clickFileMenuItem,
  E2E_SAVE_PATH,
};
