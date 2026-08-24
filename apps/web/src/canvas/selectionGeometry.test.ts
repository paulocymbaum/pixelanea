import { describe, expect, it } from "vitest";
import {
  cellsInSelection,
  isCellInEllipseSelection,
  isCellInSelection,
  selectionBbox,
  selectionShapeFromModifiers,
} from "./selectionGeometry";
import {
  extractSelectionPixels,
  buildClearSelectionCellChanges,
} from "./selectionExtraction";
import { buildPasteCellChanges } from "@/state/commands/pasteCells";
import { buildMoveSelectionChanges } from "@/state/commands/moveSelection";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

describe("selectionShapeFromModifiers", () => {
  it("returns rect without modifiers", () => {
    expect(selectionShapeFromModifiers(false, false)).toBe("rect");
  });

  it("returns square with shift only", () => {
    expect(selectionShapeFromModifiers(true, false)).toBe("square");
  });

  it("returns ellipse with shift and c", () => {
    expect(selectionShapeFromModifiers(true, true)).toBe("ellipse");
  });

  it("ignores c without shift", () => {
    expect(selectionShapeFromModifiers(false, true)).toBe("rect");
  });
});

describe("selectionBbox rect", () => {
  it("returns a 1x1 rect for a single cell", () => {
    expect(selectionBbox({ x: 2, y: 3 }, { x: 2, y: 3 }, "rect")).toEqual({
      x: 2,
      y: 3,
      width: 1,
      height: 1,
      shape: "rect",
    });
  });

  it("normalizes when dragging up-left from anchor", () => {
    expect(selectionBbox({ x: 5, y: 5 }, { x: 2, y: 1 }, "rect")).toEqual({
      x: 2,
      y: 1,
      width: 4,
      height: 5,
      shape: "rect",
    });
  });

  it("normalizes when dragging down-right from anchor", () => {
    expect(selectionBbox({ x: 1, y: 1 }, { x: 4, y: 3 }, "rect")).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 3,
      shape: "rect",
    });
  });

  it("handles horizontal and vertical lines as thin rects", () => {
    expect(selectionBbox({ x: 0, y: 2 }, { x: 5, y: 2 }, "rect")).toEqual({
      x: 0,
      y: 2,
      width: 6,
      height: 1,
      shape: "rect",
    });
    expect(selectionBbox({ x: 3, y: 0 }, { x: 3, y: 4 }, "rect")).toEqual({
      x: 3,
      y: 0,
      width: 1,
      height: 5,
      shape: "rect",
    });
  });
});

describe("selectionBbox square", () => {
  it("constrains a wider horizontal drag to a square", () => {
    expect(selectionBbox({ x: 1, y: 1 }, { x: 4, y: 2 }, "square")).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 4,
      shape: "square",
    });
  });

  it("constrains a taller vertical drag to a square", () => {
    expect(selectionBbox({ x: 2, y: 0 }, { x: 3, y: 6 }, "square")).toEqual({
      x: 2,
      y: 0,
      width: 7,
      height: 7,
      shape: "square",
    });
  });

  it("anchors up-left when dragging negative deltas", () => {
    expect(selectionBbox({ x: 5, y: 5 }, { x: 2, y: 1 }, "square")).toEqual({
      x: 1,
      y: 1,
      width: 5,
      height: 5,
      shape: "square",
    });
  });

  it("keeps a 1x1 square for a click", () => {
    expect(selectionBbox({ x: 3, y: 4 }, { x: 3, y: 4 }, "square")).toEqual({
      x: 3,
      y: 4,
      width: 1,
      height: 1,
      shape: "square",
    });
  });
});

describe("selectionBbox ellipse", () => {
  it("uses the drag bbox with ellipse shape", () => {
    expect(selectionBbox({ x: 1, y: 1 }, { x: 4, y: 3 }, "ellipse")).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 3,
      shape: "ellipse",
    });
  });

  it("has equal radii when the drag bbox is square", () => {
    const selection = selectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 }, "ellipse");
    expect(selection.width).toBe(selection.height);
    expect(selection.shape).toBe("ellipse");
  });
});

describe("isCellInEllipseSelection", () => {
  const ellipse = selectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 }, "ellipse");

  it("includes the center cell", () => {
    expect(isCellInEllipseSelection({ x: 2, y: 2 }, ellipse)).toBe(true);
  });

  it("excludes sharp corners outside the inscribed circle", () => {
    expect(isCellInEllipseSelection({ x: 0, y: 0 }, ellipse)).toBe(false);
    expect(isCellInEllipseSelection({ x: 4, y: 0 }, ellipse)).toBe(false);
    expect(isCellInEllipseSelection({ x: 0, y: 4 }, ellipse)).toBe(false);
    expect(isCellInEllipseSelection({ x: 4, y: 4 }, ellipse)).toBe(false);
  });

  it("includes edge cells on the major axis", () => {
    expect(isCellInEllipseSelection({ x: 2, y: 0 }, ellipse)).toBe(true);
    expect(isCellInEllipseSelection({ x: 2, y: 4 }, ellipse)).toBe(true);
    expect(isCellInEllipseSelection({ x: 0, y: 2 }, ellipse)).toBe(true);
    expect(isCellInEllipseSelection({ x: 4, y: 2 }, ellipse)).toBe(true);
  });

  it("includes a single clicked cell", () => {
    const single = selectionBbox({ x: 3, y: 3 }, { x: 3, y: 3 }, "ellipse");
    expect(isCellInEllipseSelection({ x: 3, y: 3 }, single)).toBe(true);
    expect(isCellInEllipseSelection({ x: 4, y: 3 }, single)).toBe(false);
  });
});

describe("cellsInSelection", () => {
  it("returns all rect cells in the bbox", () => {
    const rect = selectionBbox({ x: 1, y: 1 }, { x: 2, y: 2 }, "rect");
    expect(cellsInSelection(rect)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it("filters ellipse cells to the inscribed region", () => {
    const ellipse = selectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 }, "ellipse");
    const cells = cellsInSelection(ellipse);
    expect(cells).toContainEqual({ x: 2, y: 2 });
    expect(cells).not.toContainEqual({ x: 0, y: 0 });
    expect(cells.length).toBeLessThan(25);
    expect(cells.length).toBeGreaterThan(9);
  });

  it("clips cells to grid bounds when provided", () => {
    const rect = selectionBbox({ x: 0, y: 0 }, { x: 2, y: 2 }, "rect");
    expect(cellsInSelection(rect, 2, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });
});

/**
 * Golden vectors mirrored from server/tests/selection_ops_test.cpp.
 * Keep FE and BE in lockstep — if either side drifts, these fail first.
 */
describe("selection golden matrix (FE ≡ BE selection_ops_test)", () => {
  function grid4x4(): Uint8Array {
    return new Uint8Array(16).fill(TRANSPARENT_INDEX);
  }

  it("extract_selection_pixels copies rect selection", () => {
    const pixels = grid4x4();
    pixels[0] = 1;
    pixels[1] = 2;
    pixels[4] = 3;
    pixels[5] = 4;

    const clip = extractSelectionPixels(pixels, 4, 4, {
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      shape: "rect",
    });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([1, 2, 3, 4]);
  });

  it("extract_selection_pixels masks ellipse cells", () => {
    const pixels = grid4x4();
    pixels[5] = 4;

    const clip = extractSelectionPixels(pixels, 4, 4, {
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      shape: "ellipse",
    });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(3);
    expect(clip!.height).toBe(3);
    expect(clip!.pixels[0]).toBe(TRANSPARENT_INDEX);
    expect(clip!.pixels[1 * 3 + 1]).toBe(4);
  });

  it("build_clear_selection_changes clears masked pixels", () => {
    const pixels = grid4x4();
    pixels[0] = 1;
    pixels[1] = 2;

    const changes = buildClearSelectionCellChanges(pixels, 4, 4, {
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      shape: "rect",
    });
    expect(changes).toHaveLength(2);
    expect(changes[0]?.previous).toBe(1);
    expect(changes[0]?.next).toBe(TRANSPARENT_INDEX);
    expect(changes[1]?.previous).toBe(2);
  });

  it("build_paste_changes stamps clipboard at origin", () => {
    const pixels = grid4x4();
    const clipboard = {
      width: 2,
      height: 2,
      pixels: new Uint8Array([5, 6, 7, 8]),
    };
    const changes = buildPasteCellChanges(clipboard, 1, 1, pixels, 4, 4);
    expect(changes).toHaveLength(4);
    expect(changes[0]).toMatchObject({ x: 1, y: 1, next: 5 });
  });

  it("build_move_selection_changes moves rect selection", () => {
    const pixels = grid4x4();
    pixels[0] = 1;
    pixels[1] = 2;
    pixels[4] = 3;
    pixels[5] = 4;

    const changes = buildMoveSelectionChanges(
      pixels,
      4,
      4,
      { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
      1,
      0,
    );
    expect(changes).toHaveLength(8);

    const merged = new Uint8Array(pixels);
    for (const change of changes) {
      merged[change.y * 4 + change.x] = change.next;
    }

    expect(merged[0]).toBe(TRANSPARENT_INDEX);
    expect(merged[4]).toBe(TRANSPARENT_INDEX);
    expect(merged[1]).toBe(1);
    expect(merged[2]).toBe(2);
    expect(merged[5]).toBe(3);
    expect(merged[6]).toBe(4);
  });

  it("is_cell_in_selection ellipse center cell", () => {
    expect(
      isCellInSelection(
        { x: 0, y: 0 },
        { x: 0, y: 0, width: 1, height: 1, shape: "ellipse" },
      ),
    ).toBe(true);
  });
});
