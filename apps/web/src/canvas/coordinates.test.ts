import { describe, expect, it } from "vitest";
import {
  cellToScreen,
  clampZoom,
  fitToView,
  formatZoomPercent,
  isCellInBounds,
  screenToCell,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAtPoint,
  zoomIn,
  zoomOut,
} from "./coordinates";

describe("clampZoom", () => {
  it("clamps below minimum", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
  });

  it("clamps above maximum", () => {
    expect(clampZoom(100)).toBe(ZOOM_MAX);
  });

  it("passes through valid zoom", () => {
    expect(clampZoom(4)).toBe(4);
  });
});

describe("screenToCell", () => {
  const viewport = { zoom: 10, panX: 20, panY: 30 };

  it("maps screen point to cell coordinates", () => {
    expect(screenToCell(45, 55, viewport)).toEqual({ x: 2, y: 2 });
  });

  it("floors partial cell offsets", () => {
    expect(screenToCell(49, 59, viewport)).toEqual({ x: 2, y: 2 });
    expect(screenToCell(50, 60, viewport)).toEqual({ x: 3, y: 3 });
  });
});

describe("isCellInBounds", () => {
  it("accepts in-bounds cells", () => {
    expect(isCellInBounds({ x: 0, y: 0 }, 32, 32)).toBe(true);
    expect(isCellInBounds({ x: 31, y: 31 }, 32, 32)).toBe(true);
  });

  it("rejects out-of-bounds cells", () => {
    expect(isCellInBounds({ x: -1, y: 0 }, 32, 32)).toBe(false);
    expect(isCellInBounds({ x: 32, y: 0 }, 32, 32)).toBe(false);
  });
});

describe("cellToScreen", () => {
  it("maps cell origin to screen space", () => {
    expect(cellToScreen({ x: 2, y: 3 }, { zoom: 10, panX: 5, panY: 7 })).toEqual({
      x: 25,
      y: 37,
    });
  });
});

describe("fitToView", () => {
  it("centers grid and picks zoom to fit", () => {
    const viewport = fitToView({ width: 100, height: 100 }, 32, 32, 0);
    expect(viewport.zoom).toBeCloseTo(100 / 32);
    expect(viewport.panX).toBeCloseTo(0);
    expect(viewport.panY).toBeCloseTo(0);
  });

  it("respects padding", () => {
    const viewport = fitToView({ width: 100, height: 100 }, 32, 32, 10);
    expect(viewport.zoom).toBeCloseTo(80 / 32);
    expect(viewport.panX).toBeCloseTo(10);
    expect(viewport.panY).toBeCloseTo(10);
  });
});

describe("zoomAtPoint", () => {
  it("keeps anchor fixed when zooming", () => {
    const before = { zoom: 2, panX: 10, panY: 20 };
    const after = zoomAtPoint(before, 50, 60, 4);
    const cellBefore = screenToCell(50, 60, before);
    const cellAfter = screenToCell(50, 60, after);
    expect(cellAfter).toEqual(cellBefore);
  });
});

describe("zoomIn and zoomOut", () => {
  it("increases and decreases zoom", () => {
    const start = { zoom: 1, panX: 0, panY: 0 };
    const bigger = zoomIn(start);
    expect(bigger.zoom).toBeGreaterThan(start.zoom);
    const smaller = zoomOut(bigger);
    expect(smaller.zoom).toBeCloseTo(start.zoom, 5);
  });

  it("with anchor keeps the anchor cell fixed on screen", () => {
    const viewport = fitToView({ width: 200, height: 200 }, 32, 32);
    const anchor = { x: 100, y: 100 };
    const zoomedIn = zoomIn(viewport, anchor);
    expect(screenToCell(anchor.x, anchor.y, viewport)).toEqual(
      screenToCell(anchor.x, anchor.y, zoomedIn),
    );
    const zoomedOut = zoomOut(zoomedIn, anchor);
    expect(screenToCell(anchor.x, anchor.y, viewport)).toEqual(
      screenToCell(anchor.x, anchor.y, zoomedOut),
    );
  });
});

describe("formatZoomPercent", () => {
  it("formats zoom as percentage", () => {
    expect(formatZoomPercent(1)).toBe("100%");
    expect(formatZoomPercent(0.25)).toBe("25%");
    expect(formatZoomPercent(8)).toBe("800%");
  });
});
