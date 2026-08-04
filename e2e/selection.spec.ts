import { expect, test } from "@playwright/test";
import {
  createBlankProject,
  dismissOnboarding,
  paintStroke,
  prepareEditorForPaint,
  waitForFrameSync,
} from "./helpers";

async function paintDragOnCanvas(
  page: import("@playwright/test").Page,
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

async function selectRegion(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await paintDragOnCanvas(
    page,
    { xRatio: 0.35, yRatio: 0.35 },
    { xRatio: 0.55, yRatio: 0.55 },
  );
  await expect(page.getByRole("toolbar", { name: "Selection actions" })).toBeVisible({
    timeout: 5_000,
  });
}

test.describe("selection workflows", () => {
  test("select → bar Move → drag → undo", async ({ page }) => {
    await createBlankProject(page);
    await prepareEditorForPaint(page);
    await paintStroke(page);
    await waitForFrameSync(page);

    await selectRegion(page);
    await page.getByRole("button", { name: "Move selection" }).click();
    await expect(page.getByText("Drag or arrow keys to nudge")).toBeVisible({
      timeout: 5_000,
    });

    await paintDragOnCanvas(
      page,
      { xRatio: 0.5, yRatio: 0.5 },
      { xRatio: 0.65, yRatio: 0.65 },
    );

    const sync = waitForFrameSync(page);
    await page.keyboard.press("Enter");
    await sync;

    await page.keyboard.press("Control+z");
    await waitForFrameSync(page);
  });

  test("select → Copy → Paste → Place", async ({ page }) => {
    await createBlankProject(page);
    await prepareEditorForPaint(page);
    await paintStroke(page);
    await waitForFrameSync(page);

    await selectRegion(page);
    await page.getByRole("button", { name: "Copy selection (Ctrl+C)" }).click();
    await expect(page.getByText("Copied.")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Paste selection (Ctrl+V)" }).click();
    await expect(page.getByText("Arrow keys to nudge")).toBeVisible({
      timeout: 5_000,
    });

    const sync = waitForFrameSync(page);
    await page.keyboard.press("Enter");
    await sync;
  });
});
