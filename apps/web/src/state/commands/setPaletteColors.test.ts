import { describe, expect, it } from "vitest";
import { SetPaletteColorsCommand } from "./setPaletteColors";

describe("SetPaletteColorsCommand", () => {
  it("records previous and next palette for undo", () => {
    const command = new SetPaletteColorsCommand(
      ["#000000", "#FFFFFF"],
      1,
      ["#111111", "#222222", "#333333"],
    );

    expect(command.paletteApplyState()).toEqual({
      paletteColors: ["#111111", "#222222", "#333333"],
      activeColorIndex: 1,
    });
    expect(command.paletteRevertState()).toEqual({
      paletteColors: ["#000000", "#FFFFFF"],
      activeColorIndex: 1,
    });
  });
});
