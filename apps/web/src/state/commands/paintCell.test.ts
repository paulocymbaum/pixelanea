import { describe, expect, it } from "vitest";
import { PaintCellCommand } from "./paintCell";
import { TRANSPARENT_INDEX } from "./types";

describe("PaintCellCommand", () => {
  it("applies and reverts a cell paint", () => {
    const pixels = new Uint8Array(4);
    const command = new PaintCellCommand(1, 0, TRANSPARENT_INDEX, 2);

    command.apply(pixels, 2);
    expect(pixels[1]).toBe(2);

    command.revert(pixels, 2);
    expect(pixels[1]).toBe(TRANSPARENT_INDEX);
  });
});
