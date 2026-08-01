import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  clickFileMenuItem,
  createBlankProject,
  paintStroke,
  waitForFramePut,
} from "./helpers";

test.describe("@export", () => {
  test("Export PNG downloads current frame as a valid PNG", async ({ page }) => {
    await createBlankProject(page);
    await paintStroke(page);
    await waitForFramePut(page);

    const downloadPromise = page.waitForEvent("download");
    await clickFileMenuItem(page, "Export PNG");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Untitled-project-frame-1.png");

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const bytes = await fs.readFile(downloadPath!);
    expect(bytes.subarray(0, 4).toString("hex")).toBe("89504e47");

    await expect(page.getByText("Exported Untitled-project-frame-1.png.")).toBeVisible({
      timeout: 10_000,
    });
  });
});
