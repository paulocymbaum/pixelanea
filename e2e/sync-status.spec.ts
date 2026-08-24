import { expect, test } from "@playwright/test";
import {
  createBlankProject,
  expectPixelsSyncedToServer,
  isFrameSyncRequest,
  paintStroke,
  statusBar,
} from "./helpers";

test.describe("@smoke @sync status bar", () => {
  test("SYNC-UX-001: paint settles on synced-not-saved after server PUT", async ({
    page,
  }) => {
    await createBlankProject(page);

    const framePut = page.waitForResponse(
      (response) =>
        isFrameSyncRequest(response.url(), response.request().method()) &&
        response.ok(),
      { timeout: 15_000 },
    );

    await paintStroke(page);
    await framePut;

    await expectPixelsSyncedToServer(page);
  });

  test("SYNC-UX-002: delayed PUT shows syncing then synced-not-saved", async ({
    page,
  }) => {
    await createBlankProject(page);

    let releasePut: (() => void) | undefined;
    const putGate = new Promise<void>((resolve) => {
      releasePut = resolve;
    });

    await page.route("**/api/projects/*/frames/**", async (route) => {
      if (!isFrameSyncRequest(route.request().url(), route.request().method())) {
        await route.continue();
        return;
      }
      await putGate;
      await route.continue();
    });

    await paintStroke(page);

    await expect(statusBar(page)).toContainText(
      /Sync pending|Syncing to server|Saving|Unsaved changes/,
      { timeout: 5_000 },
    );

    releasePut?.();

    await page.waitForResponse(
      (response) =>
        isFrameSyncRequest(response.url(), response.request().method()) &&
        response.ok(),
      { timeout: 15_000 },
    );

    await expectPixelsSyncedToServer(page);
  });
});
