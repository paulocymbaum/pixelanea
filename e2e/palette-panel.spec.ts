import { expect, test } from "@playwright/test";
import {
  canvasHasPaintNear,
  collapsePalettePanel,
  createBlankProject,
  dismissOnboarding,
  expandPalettePanel,
  getFramePixels,
  paintStroke,
  palettePanel,
  paletteSectionContent,
  paletteSectionNav,
  selectPaletteColor,
  selectPaletteSection,
  waitForFramePut,
} from "./helpers";

test.describe("@smoke palette section rail", () => {
  test("PR-HP-001: blank project defaults to Swatches with grid and actions visible", async ({
    page,
  }) => {
    await createBlankProject(page);

    const nav = paletteSectionNav(page);
    await expect(nav.getByRole("button", { name: "Swatches" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    const panel = palettePanel(page);
    const listbox = panel.getByRole("listbox", { name: "Palette colors" });
    const addColor = panel.getByRole("button", { name: "Add color" });

    await expect(listbox).toBeVisible();
    await expect(addColor).toBeVisible();
    await expect(panel.getByRole("button", { name: "Edit color" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Remove color" })).toBeVisible();

    const listboxBox = await listbox.boundingBox();
    const addBox = await addColor.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(listboxBox).toBeTruthy();
    expect(addBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(listboxBox!.y + listboxBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height);
    expect(addBox!.y + addBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height);
  });

  test("PR-HP-002: each section tab shows only its own content", async ({ page }) => {
    await createBlankProject(page);
    const content = paletteSectionContent(page);

    await selectPaletteSection(page, "swatches");
    await expect(content.getByRole("listbox", { name: "Palette colors" })).toBeVisible();
    await expect(content.getByRole("button", { name: "Retro" })).toBeVisible();
    await expect(content.locator('section[aria-label="Color filters"]')).not.toBeVisible();
    await expect(content.getByText("Presets", { exact: true })).not.toBeVisible();

    await selectPaletteSection(page, "presets");
    await expect(content.getByRole("button", { name: "Retro" })).toBeVisible();
    await expect(content.getByRole("listbox", { name: "Palette colors" })).not.toBeVisible();
    await expect(content.locator('section[aria-label="Color filters"]')).not.toBeVisible();

    await selectPaletteSection(page, "shading");
    await expect(content.getByText("Shading palettes")).toBeVisible();
    await expect(content.getByRole("listbox", { name: "Generated shades" })).toBeVisible();
    await expect(content.getByRole("listbox", { name: "Palette colors" })).not.toBeVisible();

    await selectPaletteSection(page, "filters");
    await expect(content.locator('section[aria-label="Color filters"]')).toBeVisible();
    await expect(content.getByRole("button", { name: "Apply to frame" })).toBeVisible();
    await expect(content.getByRole("button", { name: "Reset filters" })).toBeVisible();
    await expect(content.getByRole("listbox", { name: "Palette colors" })).not.toBeVisible();
  });

  test("PR-HP-003: Riley shades from Shading tab then paints on Swatches", async ({ page }) => {
    await createBlankProject(page);

    await selectPaletteColor(page, 1);
    await selectPaletteSection(page, "shading");
    await page.getByRole("option", { name: /Shade 1,/ }).first().click();

    await selectPaletteSection(page, "swatches");
    await page.getByRole("button", { name: "Paint", exact: true }).click();

    const putFrame = waitForFramePut(page);
    await paintStroke(page);
    await putFrame;

    expect(await canvasHasPaintNear(page, { xRatio: 0.5, yRatio: 0.5 })).toBe(true);
  });

  test("PR-HP-004: Filters overlay apply changes canvas pixels", async ({ page }) => {
    const projectId = await createBlankProject(page);
    await selectPaletteColor(page, 2);
    await page.getByRole("button", { name: "Paint", exact: true }).click();

    const paintPut = waitForFramePut(page);
    await paintStroke(page);
    await paintPut;

    const beforeApply = await getFramePixels(page, projectId, 0);
    expect(beforeApply.some((value) => value !== 0)).toBe(true);

    await selectPaletteSection(page, "filters");
    await page.getByRole("checkbox", { name: "Enable overlay" }).check();
    await page.getByRole("slider", { name: "Overlay opacity" }).focus();
    await page.keyboard.press("End");
    await expect(page.getByRole("button", { name: "Apply to frame" })).toBeEnabled();

    await page.getByRole("button", { name: "Apply to frame" }).click();
    await expect
      .poll(async () => {
        const after = await getFramePixels(page, projectId, 0);
        return after.some((value, index) => value !== beforeApply[index]);
      }, { timeout: 20_000 })
      .toBe(true);
  });

  test('PR-HP-005: Casey applies Retro preset from Presets tab', async ({ page }) => {
    await createBlankProject(page);

    await selectPaletteSection(page, "presets");
    await page.getByRole("button", { name: "Retro" }).click();

    await selectPaletteSection(page, "swatches");
    const options = page.getByRole("listbox", { name: "Palette colors" }).getByRole("option");
    await expect(options).toHaveCount(8);
    await expect(page.getByRole("option", { name: "Color 2" })).toBeVisible();
  });

  test("PR-HP-006: Add color via icon button adds a new swatch", async ({ page }) => {
    await createBlankProject(page);

    const listbox = page.getByRole("listbox", { name: "Palette colors" });
    const initialCount = await listbox.getByRole("option").count();

    await page.getByRole("button", { name: "Add color" }).click();
    await expect(page.getByRole("dialog", { name: "Add color" })).toBeVisible();
    await page.getByRole("button", { name: "Save color" }).click();

    await expect(listbox.getByRole("option")).toHaveCount(initialCount + 1);
  });

  test("PR-HP-007: collapse and expand returns to Swatches with grid", async ({ page }) => {
    await createBlankProject(page);

    await collapsePalettePanel(page);
    await expandPalettePanel(page);

    await expect(paletteSectionNav(page).getByRole("button", { name: "Swatches" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByRole("listbox", { name: "Palette colors" })).toBeVisible();
  });

  test("PR-HP-008: collapsed rail Shading icon expands panel on Shading tab", async ({
    page,
  }) => {
    await createBlankProject(page);
    await collapsePalettePanel(page);

    await paletteSectionNav(page).getByRole("button", { name: "Shading palettes" }).click();

    await expect(palettePanel(page)).toBeVisible();
    await expect(paletteSectionNav(page).getByRole("button", { name: "Shading palettes" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("Shading palettes")).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Generated shades" })).toBeVisible();
  });

  test("PR-HP-009: palette section preference persists across reload", async ({
    page,
  }) => {
    await createBlankProject(page);

    await selectPaletteSection(page, "filters");
    await expect(
      paletteSectionNav(page).getByRole("button", { name: "Color filters" }),
    ).toHaveAttribute("aria-current", "true");

    await page.reload();
    await page.getByRole("button", { name: "Start blank" }).click();
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByLabel("Pixel canvas")).toBeVisible({ timeout: 30_000 });
    await dismissOnboarding(page);

    await expect(
      paletteSectionNav(page).getByRole("button", { name: "Color filters" }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      paletteSectionContent(page).locator('section[aria-label="Color filters"]'),
    ).toBeVisible();
  });
});
