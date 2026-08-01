import { expect, test } from "@playwright/test";
import {
  countPaintedPixels,
  createBlankProject,
  getFramePixels,
  paintFrame2Mark,
  paintStroke,
} from "./helpers";

function isFramePut(url: string, method: string): boolean {
  return method === "PUT" && /\/api\/projects\/[^/]+\/frames\/\d+/.test(url);
}

async function waitForFramePutResponses(
  page: import("@playwright/test").Page,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.waitForResponse(
      (response) => isFramePut(response.url(), response.request().method()) && response.ok(),
      { timeout: 30_000 },
    );
  }
}

test.describe("@race @sync", () => {
  test("RACE-002: undo during delayed frame PUT route mock (QA-001:RACE-002)", async ({
    page,
  }) => {
    await createBlankProject(page);

    let releaseFirstPut: (() => void) | undefined;
    const firstPutGate = new Promise<void>((resolve) => {
      releaseFirstPut = resolve;
    });
    let heldFirstPut = false;

    await page.route("**/api/projects/*/frames/*", async (route) => {
      if (!isFramePut(route.request().url(), route.request().method())) {
        await route.continue();
        return;
      }

      if (!heldFirstPut) {
        heldFirstPut = true;
        await firstPutGate;
      }

      await route.continue();
    });

    await paintStroke(page);
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled({
      timeout: 10_000,
    });
    await page.waitForTimeout(600);

    await page.getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(1_200);

    const putsAfterRelease = waitForFramePutResponses(page, 2);
    releaseFirstPut?.();
    await putsAfterRelease;
    await expect(page.getByRole("status")).toContainText("All changes saved", {
      timeout: 15_000,
    });
    await expect(page.getByRole("alert")).toHaveCount(0);
    // Server coalesce after undo+in-flight PUT: paintMatrix RACE-002 + syncCoordinator tests.
  });

  test("RACE-007: newer edit wins when PUT responses arrive out of order", async ({
    page,
  }) => {
    const projectId = await createBlankProject(page);

    let releaseFirstPut: (() => void) | undefined;
    const firstPutGate = new Promise<void>((resolve) => {
      releaseFirstPut = resolve;
    });
    let putCount = 0;

    await page.route("**/api/projects/*/frames/*", async (route) => {
      if (!isFramePut(route.request().url(), route.request().method())) {
        await route.continue();
        return;
      }

      putCount += 1;
      if (putCount === 1) {
        await firstPutGate;
      }

      await route.continue();
    });

    await paintStroke(page);
    await page.waitForTimeout(600);
    await paintFrame2Mark(page);
    await page.waitForTimeout(600);

    const putsAfterRelease = waitForFramePutResponses(page, 2);
    releaseFirstPut?.();
    await putsAfterRelease;

    const paintedCount = await countPaintedPixels(page, projectId, 0);
    expect(paintedCount).toBeGreaterThan(0);

    const serverPixels = await getFramePixels(page, projectId, 0);
    expect(serverPixels.filter((value) => value !== 0).length).toBe(paintedCount);
  });
});
