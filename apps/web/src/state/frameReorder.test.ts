import { describe, expect, it } from "vitest";
import { activeIndexAfterReorder, reorderFramePixels } from "./frameReorder";

function markers(cache: Record<number, Uint8Array>): Record<number, number> {
  return Object.fromEntries(
    Object.entries(cache).map(([index, pixels]) => [Number(index), pixels[0]!]),
  );
}

function markerCache(...markerValues: number[]): Record<number, Uint8Array> {
  return Object.fromEntries(
    markerValues.map((marker, index) => [index, Uint8Array.of(marker)]),
  );
}

describe("activeIndexAfterReorder", () => {
  it("moves active frame when it was dragged", () => {
    expect(activeIndexAfterReorder(3, 3, 0)).toBe(0);
    expect(activeIndexAfterReorder(0, 0, 3)).toBe(3);
  });

  it("shifts indices when dragging over active frame", () => {
    expect(activeIndexAfterReorder(2, 0, 3)).toBe(1);
    expect(activeIndexAfterReorder(1, 3, 0)).toBe(2);
  });

  it("keeps index when unaffected", () => {
    expect(activeIndexAfterReorder(0, 1, 2)).toBe(0);
  });
});

describe("reorderFramePixels", () => {
  it("moves a frame backwards and shifts the frames it passes", () => {
    expect(markers(reorderFramePixels(markerCache(1, 2, 3, 4), 3, 1))).toEqual({
      0: 1,
      1: 4,
      2: 2,
      3: 3,
    });
  });

  it("moves a frame forwards and shifts the frames it passes", () => {
    expect(markers(reorderFramePixels(markerCache(1, 2, 3, 4), 0, 2))).toEqual({
      0: 2,
      1: 3,
      2: 1,
      3: 4,
    });
  });

  it("keeps sparse caches sparse", () => {
    const cache = { 0: Uint8Array.of(1), 3: Uint8Array.of(4) };
    expect(markers(reorderFramePixels(cache, 3, 1))).toEqual({ 0: 1, 1: 4 });
  });

  it("returns the same cache when nothing moves", () => {
    const cache = markerCache(1, 2);
    expect(reorderFramePixels(cache, 1, 1)).toBe(cache);
  });
});
