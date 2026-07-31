import { describe, expect, it } from "vitest";
import { PaintCellsCommand } from "./paintCells";
import { TRANSPARENT_INDEX } from "./types";

describe("PaintCellsCommand", () => {
  it("applies and reverts multiple cell paints in one step", () => {
    const pixels = new Uint8Array(9);
    const command = new PaintCellsCommand([
      { x: 0, y: 0, previous: TRANSPARENT_INDEX, next: 1 },
      { x: 1, y: 0, previous: TRANSPARENT_INDEX, next: 2 },
      { x: 0, y: 1, previous: TRANSPARENT_INDEX, next: 3 },
    ]);

    command.apply(pixels, 3);
    expect(pixels[0]).toBe(1);
    expect(pixels[1]).toBe(2);
    expect(pixels[3]).toBe(3);

    command.revert(pixels, 3);
    expect(pixels[0]).toBe(TRANSPARENT_INDEX);
    expect(pixels[1]).toBe(TRANSPARENT_INDEX);
    expect(pixels[3]).toBe(TRANSPARENT_INDEX);
  });
});
