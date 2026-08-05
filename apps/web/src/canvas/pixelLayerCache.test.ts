import { describe, expect, it } from "vitest";
import { getPixelLayerCanvas } from "./pixelLayerCache";

describe("pixelLayerCache", () => {
  it("reuses the cached canvas for the same pixel buffer", () => {
    const pixels = new Uint8Array([1, 0]);
    const palette = ["#000000", "#ff0000"];

    const first = getPixelLayerCanvas(pixels, palette, 2, 1);
    const second = getPixelLayerCanvas(pixels, palette, 2, 1);

    expect(second).toBe(first);
  });

  it("invalidates when pixels reference changes", () => {
    const palette = ["#000000", "#ff0000"];
    const firstPixels = new Uint8Array([1, 0]);
    const secondPixels = new Uint8Array([1, 0]);

    const first = getPixelLayerCanvas(firstPixels, palette, 2, 1);
    const second = getPixelLayerCanvas(secondPixels, palette, 2, 1);

    expect(second).not.toBe(first);
  });

  it("invalidates when palette reference changes", () => {
    const pixels = new Uint8Array([1, 0]);
    const paletteA = ["#000000", "#ff0000"];
    const paletteB = ["#000000", "#00ff00"];

    const first = getPixelLayerCanvas(pixels, paletteA, 2, 1);
    const second = getPixelLayerCanvas(pixels, paletteB, 2, 1);

    expect(second).not.toBe(first);
  });
});
