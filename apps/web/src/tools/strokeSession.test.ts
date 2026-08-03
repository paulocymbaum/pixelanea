import { describe, expect, it, vi } from "vitest";
import { StrokeSession } from "./strokeSession";
import type { ToolContext } from "./types";

function createContext(
  pixels: number[],
  overrides: Partial<ToolContext> = {},
): ToolContext {
  return {
    activeColorIndex: 2,
    activeFrameIndex: 0,
    gridWidth: 2,
    gridHeight: 2,
    readOnly: false,
    paletteLocked: false,
    paletteColorCount: 4,
    getPixelIndex: (cell) => pixels[cell.y * 2 + cell.x] ?? 0,
    dispatch: vi.fn(),
    previewCells: (changes) => {
      for (const change of changes) {
        pixels[change.y * 2 + change.x] = change.next;
      }
    },
    beginStroke: vi.fn(),
    endStroke: vi.fn(),
    setActiveColorIndex: vi.fn(),
    setActiveTool: vi.fn(),
    ...overrides,
  };
}

describe("StrokeSession", () => {
  it("keeps the first previous value when a cell is painted twice", () => {
    const pixels = [0, 0, 0, 0];
    const session = new StrokeSession();
    const ctx = createContext(pixels);

    session.begin();
    session.paintCell({ x: 1, y: 1 }, ctx);
    session.preview(ctx);

    const recolorCtx = createContext(pixels, { activeColorIndex: 3 });
    session.paintCell({ x: 1, y: 1 }, recolorCtx);

    expect(session.getChanges()).toEqual([
      { x: 1, y: 1, previous: 0, next: 3 },
    ]);
  });

  it("drops no-op changes", () => {
    const pixels = [0, 0, 0, 0];
    const session = new StrokeSession();
    const ctx = createContext(pixels, { activeColorIndex: 1 });

    session.begin();
    pixels[0] = 1;
    session.paintCell({ x: 0, y: 0 }, ctx);

    expect(session.getChanges()).toEqual([]);
  });
});
