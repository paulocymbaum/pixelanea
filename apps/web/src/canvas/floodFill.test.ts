import { describe, expect, it } from "vitest";
import { floodFill } from "./floodFill";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

describe("floodFill", () => {
  it("fills a 4-connected region matching the target color", () => {
    const grid = [
      [1, 1, 2],
      [1, 2, 2],
      [0, 0, 0],
    ];
    const getPixelIndex = ({ x, y }: { x: number; y: number }) =>
      grid[y]![x]!;

    const region = floodFill(getPixelIndex, 3, 3, { x: 0, y: 0 }, 1);

    expect(region).toHaveLength(3);
    expect(region).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
    );
  });

  it("does not fill diagonally connected cells", () => {
    const grid = [
      [1, 2],
      [2, 1],
    ];
    const getPixelIndex = ({ x, y }: { x: number; y: number }) =>
      grid[y]![x]!;

    const region = floodFill(getPixelIndex, 2, 2, { x: 0, y: 0 }, 1);

    expect(region).toEqual([{ x: 0, y: 0 }]);
  });

  it("returns empty when start is out of bounds", () => {
    const region = floodFill(() => TRANSPARENT_INDEX, 2, 2, { x: 5, y: 0 }, 0);
    expect(region).toEqual([]);
  });
});
