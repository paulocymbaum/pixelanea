import { expect, test } from "@playwright/test";
import { mockProjectPicker } from "./helpers";

test.describe("@errors", () => {
  test("Open shows plain error for missing bundle path", async ({ page }) => {
    await mockProjectPicker(page, { open: "/tmp/pixelanea-does-not-exist.pixelanea" });
    await page.goto("/");
    await page.getByRole("button", { name: "Open existing project" }).click();

    await expect(
      page.getByText("Couldn't open this file. Is it a .pixelanea project?"),
    ).toBeVisible({ timeout: 15_000 });
  });
});
