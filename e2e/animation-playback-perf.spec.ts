import { expect, test } from "@playwright/test";
import { createBlankProject } from "./helpers";

/**
 * RAF playback smoke — manual / optional CI only.
 * Excluded from default `ci:e2e` via grep-invert `@perf`.
 */
test.describe("@perf animation playback", () => {
  test("active frame advances during playback", async ({ page }) => {
    await createBlankProject(page, { frames: 8 });

    await page.getByRole("button", { name: "Play animation" }).click();

    const activeFrameLabel = () =>
      page.evaluate(() => {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[aria-current="true"]',
        );
        return btn?.getAttribute("aria-label") ?? null;
      });

    const startLabel = await activeFrameLabel();
    expect(startLabel).toBe("Frame 1");

    await page.waitForFunction(
      () => {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[aria-current="true"]',
        );
        const label = btn?.getAttribute("aria-label");
        return label != null && label !== "Frame 1";
      },
      { timeout: 10_000 },
    );

    const advancedLabel = await activeFrameLabel();
    expect(advancedLabel).not.toBe("Frame 1");

    await page.getByRole("button", { name: "Pause animation" }).click();
  });
});
