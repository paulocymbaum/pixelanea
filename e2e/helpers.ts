import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const SAMPLE_IMAGE = path.join(process.cwd(), "e2e", "fixtures", "sample.png");
export const SAMPLE_ALPHA_IMAGE = path.join(
  process.cwd(),
  "e2e",
  "fixtures",
  "sample-alpha.png",
);
export const E2E_SAVE_PATH = "/tmp/pixelanea-e2e-save.pixelanea";
export const E2E_OPEN_PATH = "/tmp/pixelanea-e2e-open.pixelanea";
/** Header shows basename only (R1-302); use for visible path assertions. */
export const E2E_SAVE_BASENAME = path.basename(E2E_SAVE_PATH);

export async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

export async function createBlankProject(
  page: Page,
  options: { frames?: 1 | 8; keepOnboarding?: boolean } = {},
): Promise<string> {
  const frames = options.frames ?? 1;
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start blank" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Start blank" }).click();

  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/projects$/.test(response.url()) &&
      response.ok(),
    { timeout: 30_000 },
  );

  if (frames === 8) {
    await page.getByRole("button", { name: /8 frames/ }).click();
  } else {
    await page.getByRole("button", { name: "Create project" }).click();
  }

  const created = await createResponse;
  const project = (await created.json()) as { id: string };

  await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
  if (!options.keepOnboarding) {
    await dismissOnboarding(page);
  }

  return project.id;
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
  await page.mouse.move(endX, endY, { steps: 6 });
  await page.mouse.up();
}

export async function prepareEditorForPaint(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fit canvas to view" }).click();
  await page.getByRole("option", { name: "Color 1" }).click();
}

export async function paintStroke(page: Page): Promise<void> {
  await paintDragOnCanvas(
    page,
    { xRatio: 0.45, yRatio: 0.45 },
    { xRatio: 0.55, yRatio: 0.55 },
  );
}

/** Horizontal stroke near the top of the canvas (row 0 in fit-to-view). */
export async function paintRowZeroStroke(page: Page): Promise<void> {
  await paintDragOnCanvas(
    page,
    { xRatio: 0.2, yRatio: 0.12 },
    { xRatio: 0.8, yRatio: 0.12 },
  );
}

/** Distinct stroke for multi-frame round-trip checks (upper-left diagonal). */
export async function paintFrame2Mark(page: Page): Promise<void> {
  await paintDragOnCanvas(
    page,
    { xRatio: 0.2, yRatio: 0.2 },
    { xRatio: 0.35, yRatio: 0.35 },
  );
}

export async function selectPaletteColor(page: Page, colorNumber: number): Promise<void> {
  await page.getByRole("option", { name: `Color ${colorNumber}` }).click();
}

export async function selectFrame(page: Page, frameNumber: number): Promise<void> {
  // Copy-from-frame menu overlaps the thumbnail corner in the frame strip.
  await page
    .getByRole("button", { name: `Frame ${frameNumber}` })
    .click({ force: true });
}

export async function waitForFramePut(page: Page): Promise<void> {
  await page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/projects\/[^/]+\/frames\/\d+/.test(response.url()) &&
      response.ok(),
    { timeout: 30_000 },
  );
}

/** Count non-transparent pixels in a frame via the API (reliable after round-trip). */
export async function countPaintedPixels(
  page: Page,
  projectId: string,
  frameIndex: number,
): Promise<number> {
  const response = await page.request.get(
    `/api/projects/${projectId}/frames/${frameIndex}`,
  );
  expect(response.ok()).toBeTruthy();
  const frame = (await response.json()) as { pixels: number[] };
  return frame.pixels.filter((value) => value !== 0).length;
}

export async function getFramePixels(
  page: Page,
  projectId: string,
  frameIndex: number,
): Promise<number[]> {
  const response = await page.request.get(
    `/api/projects/${projectId}/frames/${frameIndex}`,
  );
  expect(response.ok()).toBeTruthy();
  const frame = (await response.json()) as { pixels: number[] };
  return frame.pixels;
}

type CanvasPoint = { xRatio: number; yRatio: number };

/** True when the canvas pixel near a relative point looks painted (not checkerboard). */
export async function canvasHasPaintNear(
  page: Page,
  { xRatio, yRatio }: CanvasPoint,
): Promise<boolean> {
  return page.getByLabel("Pixel canvas").evaluate((canvas, coords) => {
    const el = canvas as HTMLCanvasElement;
    const ctx = el.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return false;
    }

    const x = Math.floor(el.width * coords.xRatio);
    const y = Math.floor(el.height * coords.yRatio);
    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
    if (a < 200) {
      return false;
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 180;
  }, { xRatio, yRatio });
}

export async function enterEditorAfterReload(page: Page): Promise<void> {
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: "Start blank" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
}

/** Release the server-side session so a bundle can be opened again after reload. */
export async function closeProjectSession(page: Page, projectId: string): Promise<void> {
  const response = await page.request.delete(`/api/projects/${projectId}`);
  expect(response.ok()).toBeTruthy();
}

export async function openFileMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "File" }).click();
}

export async function clickFileMenuItem(page: Page, label: string): Promise<void> {
  await openFileMenu(page);
  await page.getByRole("menuitem", { name: label }).click();
}

export async function mockProjectPicker(
  page: Page,
  paths: { save?: string; open?: string } = {},
): Promise<void> {
  const savePath = paths.save ?? E2E_SAVE_PATH;
  const openPath = paths.open ?? paths.save ?? E2E_OPEN_PATH;

  await page.route("**/api/dialog/pick-project-path", async (route) => {
    const body = route.request().postDataJSON() as { mode: "open" | "saveAs" };
    const selected = body.mode === "open" ? openPath : savePath;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ path: selected, cancelled: false }),
    });
  });
}

export async function openProjectFromLanding(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open existing project" }).click();
  await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
}

export async function openProjectFromFileMenu(page: Page): Promise<void> {
  await clickFileMenuItem(page, "Open");
  await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
}

export async function confirmOverwriteIfShown(page: Page): Promise<void> {
  const overwriteDialog = page.getByRole("dialog", { name: "Replace existing file?" });
  try {
    await overwriteDialog.waitFor({ state: "visible", timeout: 10_000 });
    await overwriteDialog.getByRole("button", { name: "Replace file" }).click();
  } catch {
    // No overwrite prompt — first save to path.
  }
}

export async function openImportWizard(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "From image" }).click();
  await expect(page.getByRole("heading", { name: "Import image" })).toBeVisible();
}

export async function advanceImportToPreview(
  page: Page,
  imagePath: string,
  fileName?: string,
): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(imagePath);
  if (fileName) {
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 10_000 });
  }
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("tab", { name: "Resolution" })).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("tab", { name: "Palette" })).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Use this result" })).toBeEnabled({
    timeout: 30_000,
  });
}

export async function acceptImportPreview(page: Page): Promise<string> {
  const projectLoad = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/api\/projects\/[^/]+$/.test(response.url()) &&
      response.ok(),
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Use this result" }).click();
  await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
  const loaded = (await (await projectLoad).json()) as { id: string };
  return loaded.id;
}

export async function runImportWizard(
  page: Page,
  options: { imagePath?: string; fileName?: string } = {},
): Promise<void> {
  const imagePath = options.imagePath ?? SAMPLE_IMAGE;
  const fileName = options.fileName ?? path.basename(imagePath);
  await openImportWizard(page);
  await advanceImportToPreview(page, imagePath, fileName);
  await acceptImportPreview(page);
  await dismissOnboarding(page);
}
