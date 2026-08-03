import { describe, expect, it } from "vitest";
import { extractSelectionPixels, buildClearSelectionCellChanges } from "./selectionExtraction";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

function grid(width: number, height: number, values: number[]): Uint8Array {
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < values.length; i++) {
    pixels[i] = values[i]!;
  }
  return pixels;
}

describe("extractSelectionPixels", () => {
  it("extracts a rectangular region with transparent indices preserved", () => {
    const pixels = grid(4, 4, [
      0, 1, 2, 3,
      4, 5, 6, 7,
      8, 9, 10, 11,
      12, 13, 14, 15,
    ]);

    const result = extractSelectionPixels(pixels, 4, 4, {
      x: 1,
      y: 1,
      width: 2,
      height: 2,
      shape: "rect",
    });

    expect(result).toEqual({
      width: 2,
      height: 2,
      pixels: new Uint8Array([5, 6, 9, 10]),
    });
  });

  it("masks cells outside an ellipse selection", () => {
    const pixels = grid(5, 5, [
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 2, 1, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 0, 0,
    ]);

    const result = extractSelectionPixels(pixels, 5, 5, {
      x: 1,
      y: 1,
      width: 3,
      height: 3,
      shape: "ellipse",
    });

    expect(result?.width).toBe(3);
    expect(result?.height).toBe(3);
    expect(Array.from(result!.pixels)).toEqual([
      TRANSPARENT_INDEX,
      1,
      TRANSPARENT_INDEX,
      1,
      2,
      1,
      TRANSPARENT_INDEX,
      1,
      TRANSPARENT_INDEX,
    ]);
  });

  it("returns null for zero-sized selections", () => {
    const pixels = new Uint8Array(4);
    expect(
      extractSelectionPixels(pixels, 2, 2, {
        x: 0,
        y: 0,
        width: 0,
        height: 2,
        shape: "rect",
      }),
    ).toBeNull();
  });
});

describe("buildClearSelectionCellChanges", () => {
  it("clears only non-transparent cells inside the selection mask", () => {
    const pixels = grid(4, 4, [
      0, 1, 2, 3,
      4, 5, 6, 7,
      8, 9, 10, 11,
      12, 13, 14, 15,
    ]);

    const changes = buildClearSelectionCellChanges(pixels, 4, 4, {
      x: 1,
      y: 1,
      width: 2,
      height: 2,
      shape: "rect",
    });

    expect(changes).toEqual([
      { x: 1, y: 1, previous: 5, next: TRANSPARENT_INDEX },
      { x: 2, y: 1, previous: 6, next: TRANSPARENT_INDEX },
      { x: 1, y: 2, previous: 9, next: TRANSPARENT_INDEX },
      { x: 2, y: 2, previous: 10, next: TRANSPARENT_INDEX },
    ]);
  });

  it("masks cells outside an ellipse selection", () => {
    const pixels = grid(5, 5, [
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 2, 1, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 0, 0,
    ]);

    const changes = buildClearSelectionCellChanges(pixels, 5, 5, {
      x: 1,
      y: 1,
      width: 3,
      height: 3,
      shape: "ellipse",
    });

    expect(changes).toEqual([
      { x: 2, y: 1, previous: 1, next: TRANSPARENT_INDEX },
      { x: 1, y: 2, previous: 1, next: TRANSPARENT_INDEX },
      { x: 2, y: 2, previous: 2, next: TRANSPARENT_INDEX },
      { x: 3, y: 2, previous: 1, next: TRANSPARENT_INDEX },
      { x: 2, y: 3, previous: 1, next: TRANSPARENT_INDEX },
    ]);
  });
});
