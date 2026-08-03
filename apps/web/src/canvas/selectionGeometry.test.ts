import { describe, expect, it } from "vitest";
import {
  cellsInSelection,
  ellipseSelectionBbox,
  isCellInEllipseSelection,
  rectSelectionBbox,
  selectionBbox,
  selectionShapeFromModifiers,
  squareSelectionBbox,
} from "./selectionGeometry";

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

describe("rectSelectionBbox", () => {
  it("returns a 1x1 rect for a single cell", () => {
    expect(rectSelectionBbox({ x: 2, y: 3 }, { x: 2, y: 3 })).toEqual({
      x: 2,
      y: 3,
      width: 1,
      height: 1,
      shape: "rect",
    });
  });

  it("normalizes when dragging up-left from anchor", () => {
    expect(rectSelectionBbox({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({
      x: 2,
      y: 1,
      width: 4,
      height: 5,
      shape: "rect",
    });
  });

  it("normalizes when dragging down-right from anchor", () => {
    expect(rectSelectionBbox({ x: 1, y: 1 }, { x: 4, y: 3 })).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 3,
      shape: "rect",
    });
  });

  it("handles horizontal and vertical lines as thin rects", () => {
    expect(rectSelectionBbox({ x: 0, y: 2 }, { x: 5, y: 2 })).toEqual({
      x: 0,
      y: 2,
      width: 6,
      height: 1,
      shape: "rect",
    });
    expect(rectSelectionBbox({ x: 3, y: 0 }, { x: 3, y: 4 })).toEqual({
      x: 3,
      y: 0,
      width: 1,
      height: 5,
      shape: "rect",
    });
  });
});

describe("squareSelectionBbox", () => {
  it("constrains a wider horizontal drag to a square", () => {
    expect(squareSelectionBbox({ x: 1, y: 1 }, { x: 4, y: 2 })).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 4,
      shape: "square",
    });
  });

  it("constrains a taller vertical drag to a square", () => {
    expect(squareSelectionBbox({ x: 2, y: 0 }, { x: 3, y: 6 })).toEqual({
      x: 2,
      y: 0,
      width: 7,
      height: 7,
      shape: "square",
    });
  });

  it("anchors up-left when dragging negative deltas", () => {
    expect(squareSelectionBbox({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({
      x: 1,
      y: 1,
      width: 5,
      height: 5,
      shape: "square",
    });
  });

  it("keeps a 1x1 square for a click", () => {
    expect(squareSelectionBbox({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual({
      x: 3,
      y: 4,
      width: 1,
      height: 1,
      shape: "square",
    });
  });
});

describe("ellipseSelectionBbox", () => {
  it("uses the drag bbox with ellipse shape", () => {
    expect(ellipseSelectionBbox({ x: 1, y: 1 }, { x: 4, y: 3 })).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 3,
      shape: "ellipse",
    });
  });

  it("has equal radii when the drag bbox is square", () => {
    const selection = ellipseSelectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 });
    expect(selection.width).toBe(selection.height);
    expect(selection.shape).toBe("ellipse");
  });
});

describe("selectionBbox", () => {
  it("delegates to the requested shape helper", () => {
    expect(selectionBbox({ x: 0, y: 0 }, { x: 2, y: 1 }, "square")).toEqual(
      squareSelectionBbox({ x: 0, y: 0 }, { x: 2, y: 1 }),
    );
  });
});

describe("isCellInEllipseSelection", () => {
  const ellipse = ellipseSelectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 });

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
    const single = ellipseSelectionBbox({ x: 3, y: 3 }, { x: 3, y: 3 });
    expect(isCellInEllipseSelection({ x: 3, y: 3 }, single)).toBe(true);
    expect(isCellInEllipseSelection({ x: 4, y: 3 }, single)).toBe(false);
  });
});

describe("cellsInSelection", () => {
  it("returns all rect cells in the bbox", () => {
    const rect = rectSelectionBbox({ x: 1, y: 1 }, { x: 2, y: 2 });
    expect(cellsInSelection(rect)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it("filters ellipse cells to the inscribed region", () => {
    const ellipse = ellipseSelectionBbox({ x: 0, y: 0 }, { x: 4, y: 4 });
    const cells = cellsInSelection(ellipse);
    expect(cells).toContainEqual({ x: 2, y: 2 });
    expect(cells).not.toContainEqual({ x: 0, y: 0 });
    expect(cells.length).toBeLessThan(25);
    expect(cells.length).toBeGreaterThan(9);
  });

  it("clips cells to grid bounds when provided", () => {
    const rect = rectSelectionBbox({ x: 0, y: 0 }, { x: 2, y: 2 });
    expect(cellsInSelection(rect, 2, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });
});
