import { describe, expect, it } from "vitest";
import {
  isColorIndexInUse,
  normalizeHex,
  remapPixelsAfterRemove,
} from "./paletteUtils";

describe("paletteUtils", () => {
  it("detects color index in use on canvas", () => {
    const pixels = new Uint8Array([0, 2, 0, 1]);
    expect(isColorIndexInUse(pixels, 0)).toBe(true);
    expect(isColorIndexInUse(pixels, 2)).toBe(true);
    expect(isColorIndexInUse(pixels, 3)).toBe(false);
  });

  it("normalizes hex strings", () => {
    expect(normalizeHex("ff0044")).toBe("#FF0044");
    expect(normalizeHex("#00ff99")).toBe("#00FF99");
    expect(normalizeHex("bad")).toBeNull();
  });

  it("remaps pixels after palette slot removal", () => {
    const pixels = new Uint8Array([0, 2, 1, 3]);
    const next = remapPixelsAfterRemove(pixels, 1);
    expect(Array.from(next)).toEqual([0, 1, 0, 2]);
  });
});
