import { describe, expect, it } from "vitest";
import {
  selectionActionBarAnchor,
  selectionActionBarPosition,
} from "@/canvas/SelectionActionBar";

describe("SelectionActionBar positioning", () => {
  const selection = { x: 2, y: 2, width: 4, height: 4, shape: "rect" as const };

  it("places the bar centered below the selection bbox", () => {
    const { left, top } = selectionActionBarPosition(
      selection,
      10,
      20,
      30,
      400,
      300,
    );

    expect(left).toBe(20 + (2 + 4 / 2) * 10);
    expect(top).toBe(30 + (2 + 4) * 10 + 8);
  });

  it("flips above the selection when near the bottom edge", () => {
    const { top } = selectionActionBarPosition(
      selection,
      10,
      0,
      0,
      200,
      120,
    );

    expect(top).toBe(0 + 2 * 10 - 8 - 44);
  });
});

describe("selectionActionBarAnchor", () => {
  it("prefers the active selection over preview anchors", () => {
    const selection = { x: 1, y: 1, width: 2, height: 2, shape: "rect" as const };
    const pastePreview = {
      originX: 4,
      originY: 4,
      clipboard: { width: 1, height: 1, pixels: new Uint8Array([1]) },
    };

    expect(selectionActionBarAnchor(selection, pastePreview, null)).toBe(selection);
  });

  it("anchors to paste preview when selection is cleared after cut", () => {
    const pastePreview = {
      originX: 2,
      originY: 3,
      clipboard: { width: 4, height: 2, pixels: new Uint8Array(8) },
    };

    expect(selectionActionBarAnchor(null, pastePreview, null)).toEqual({
      x: 2,
      y: 3,
      width: 4,
      height: 2,
      shape: "rect",
    });
  });
});
