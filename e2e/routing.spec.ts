import { expect, test } from "@playwright/test";
import {
  clickFileMenuItem,
  createBlankProject,
  mockProjectPicker,
  paintStroke,
} from "./helpers";

test.describe("@routing", () => {
  test("Paint → New → confirm → Cancel → still editor", async ({ page }) => {
    await createBlankProject(page);
    await paintStroke(page);
    await expect(page.getByRole("status")).toContainText("Unsaved changes", {
      timeout: 10_000,
    });

    await clickFileMenuItem(page, "New");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a new project" })).toHaveCount(
      0,
    );
  });

  test("Paint → Open → confirm → Cancel", async ({ page }) => {
    await mockProjectPicker(page);
    await createBlankProject(page);
    await paintStroke(page);
    await expect(page.getByRole("status")).toContainText("Unsaved changes", {
      timeout: 10_000,
    });

    await clickFileMenuItem(page, "Open");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible();
  });

  test("Clean → New → no dialog", async ({ page }) => {
    await createBlankProject(page);

    await clickFileMenuItem(page, "New");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Start a new project" })).toBeVisible();
  });
});
