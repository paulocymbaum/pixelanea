import { expect, test } from "@playwright/test";
import { completeFallbackProjectPathIfShown, mockProjectPicker } from "./helpers";

test.describe("@errors", () => {
  test("Open shows plain error for missing bundle path", async ({ page }) => {
    const missingPath = "/tmp/pixelanea-does-not-exist.pixelanea";
    await mockProjectPicker(page, { open: missingPath });
    await page.goto("/");
    await page.getByRole("button", { name: "Open existing project" }).click();

    await completeFallbackProjectPathIfShown(page, { path: missingPath, mode: "open" });

    const openDialog = page.getByRole("dialog", { name: "Open project" });
    await expect(openDialog.getByRole("alert")).toContainText(
      "Couldn't open this file. Is it a .pixelanea project?",
      { timeout: 15_000 },
    );
  });
});
