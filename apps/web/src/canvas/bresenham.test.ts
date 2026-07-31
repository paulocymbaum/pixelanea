import { describe, expect, it } from "vitest";
import { bresenhamLine } from "./bresenham";

describe("bresenhamLine", () => {
  it("returns a single cell for identical endpoints", () => {
    expect(bresenhamLine(1, 2, 1, 2)).toEqual([{ x: 1, y: 2 }]);
  });

  it("draws a horizontal line", () => {
    expect(bresenhamLine(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("draws a vertical line", () => {
    expect(bresenhamLine(2, 0, 2, 2)).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it("draws a diagonal line", () => {
    const cells = bresenhamLine(0, 0, 2, 2);
    expect(cells[0]).toEqual({ x: 0, y: 0 });
    expect(cells[cells.length - 1]).toEqual({ x: 2, y: 2 });
    expect(cells).toHaveLength(3);
  });
});
