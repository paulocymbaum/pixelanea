import { describe, expect, it } from "vitest";
import {
  getQuickPalettePresets,
  QUICK_PALETTE_PRESET_IDS,
} from "./palettePresetCatalog";

describe("getQuickPalettePresets", () => {
  it("returns all curated presets when no last preset", () => {
    const presets = getQuickPalettePresets(null);
    expect(presets.map((p) => p.id)).toEqual([...QUICK_PALETTE_PRESET_IDS]);
    expect(presets).toHaveLength(6);
  });

  it("puts last preset first when not already first", () => {
    const presets = getQuickPalettePresets("pico8");
    expect(presets[0]?.id).toBe("pico8");
    expect(presets).toHaveLength(6);
    expect(presets.map((p) => p.id)).toEqual([
      "pico8",
      "retro",
      "gameboy",
      "monochrome",
      "nes",
      "pastel",
    ]);
  });

  it("deduplicates when last preset is already first in list", () => {
    const presets = getQuickPalettePresets("retro");
    expect(presets.map((p) => p.id)).toEqual([...QUICK_PALETTE_PRESET_IDS]);
  });

  it("ignores source selection when ordering presets", () => {
    const presets = getQuickPalettePresets("source");
    expect(presets.map((p) => p.id)).toEqual([...QUICK_PALETTE_PRESET_IDS]);
  });
});
