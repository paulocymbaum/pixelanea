import { expect, test } from "@playwright/test";
import { createBlankProject } from "./helpers";

/**
 * RAF playback smoke — manual / optional CI only.
 * Excluded from default `ci:e2e` via grep-invert `@perf`.
 */
test.describe("@perf animation playback", () => {
  test("active frame advances during playback", async ({ page }) => {
    await createBlankProject(page, { frames: 8 });

    // Scope to frame thumbnails — palette section tabs also use aria-current.
    const activeFrameThumb = () =>
      page.locator(
        '[aria-label="Frame strip"] button[aria-current="true"][aria-label^="Frame "]',
      );

    await page.getByRole("button", { name: "Play animation" }).click();

    await expect(activeFrameThumb()).toHaveAttribute("aria-label", "Frame 1");

    await expect(activeFrameThumb()).not.toHaveAttribute("aria-label", "Frame 1", {
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Pause animation" }).click();
  });
});
