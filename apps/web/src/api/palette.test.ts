import { describe, expect, it } from "vitest";
import {
  paletteColorsFromApi,
  paletteColorsFromPresetSlots,
  paletteColorsToImportSlots,
} from "./palette";

describe("paletteColorsFromApi", () => {
  it("indexes colors by API slot, reserving slot 0 for transparency", () => {
    const colors = paletteColorsFromApi({
      id: "p1",
      name: "Imported",
      colors: [
        { slot: 1, hex: "#112233" },
        { slot: 2, hex: "#AABBCC" },
      ],
    });

    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe("#000000");
    expect(colors[1]).toBe("#112233");
    expect(colors[2]).toBe("#AABBCC");
  });

  it("keeps contiguous default palettes aligned by slot", () => {
    const colors = paletteColorsFromApi({
      id: "p1",
      name: "Default",
      colors: [
        { slot: 0, hex: "#000000" },
        { slot: 1, hex: "#FFFFFF" },
      ],
    });

    expect(colors).toEqual(["#000000", "#FFFFFF"]);
  });
});

describe("import palette slot mapping", () => {
  it("writes preset colors to slots 1..N", () => {
    expect(paletteColorsToImportSlots(["#111111", "#222222"])).toEqual({
      colors: [
        { slot: 1, hex: "#111111" },
        { slot: 2, hex: "#222222" },
      ],
    });
  });

  it("builds sparse renderer array for import presets", () => {
    expect(paletteColorsFromPresetSlots(["#111111", "#222222"])).toEqual([
      "#000000",
      "#111111",
      "#222222",
    ]);
  });
});
