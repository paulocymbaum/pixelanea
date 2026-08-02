import { describe, expect, it } from "vitest";
import {
  getQuickPalettePresets,
  QUICK_PALETTE_PRESET_IDS,
} from "./palettePresets";

describe("getQuickPalettePresets", () => {
  it("returns curated ids when no last preset", () => {
    const presets = getQuickPalettePresets(null);
    expect(presets.map((p) => p.id)).toEqual([...QUICK_PALETTE_PRESET_IDS]);
  });

  it("puts last preset first when not in curated list", () => {
    const presets = getQuickPalettePresets("pico8");
    expect(presets[0]?.id).toBe("pico8");
    expect(presets).toHaveLength(4);
    expect(presets.map((p) => p.id)).toEqual([
      "pico8",
      "retro",
      "gameboy",
      "monochrome",
    ]);
  });

  it("deduplicates when last preset is already curated", () => {
    const presets = getQuickPalettePresets("retro");
    expect(presets.map((p) => p.id)).toEqual([...QUICK_PALETTE_PRESET_IDS]);
  });
});
