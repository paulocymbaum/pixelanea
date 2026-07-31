import { describe, expect, it } from "vitest";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import {
  countOffPalettePixels,
  scanFramesForOffPalette,
} from "./offPaletteCheck";

describe("countOffPalettePixels", () => {
  it("ignores transparent cells and in-palette indices", () => {
    const pixels = new Uint8Array([
      TRANSPARENT_INDEX,
      1,
      2,
      TRANSPARENT_INDEX,
    ]);
    expect(countOffPalettePixels(pixels, 3)).toBe(0);
  });

  it("counts indices at or beyond palette length", () => {
    const pixels = new Uint8Array([3, 4, 1, TRANSPARENT_INDEX]);
    expect(countOffPalettePixels(pixels, 3)).toBe(2);
  });
});

describe("scanFramesForOffPalette", () => {
  it("aggregates across frames", () => {
    const frame0 = new Uint8Array([1, 5]);
    const frame1 = new Uint8Array([TRANSPARENT_INDEX, 2]);
    const frame2 = new Uint8Array([6, 7]);

    expect(scanFramesForOffPalette([frame0, frame1, frame2], 4)).toEqual({
      hasOffPalette: true,
      offPaletteCellCount: 3,
      affectedFrameCount: 2,
    });
  });

  it("reports clean when all frames are valid", () => {
    const frame0 = new Uint8Array([TRANSPARENT_INDEX, 2]);
    const frame1 = new Uint8Array([1, 3]);

    expect(scanFramesForOffPalette([frame0, frame1], 4)).toEqual({
      hasOffPalette: false,
      offPaletteCellCount: 0,
      affectedFrameCount: 0,
    });
  });
});
