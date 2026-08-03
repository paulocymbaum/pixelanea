import { describe, expect, it } from "vitest";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { lineTool } from "./lineTool";
import type { ToolContext } from "./types";
import { stubStrokeContext } from "./testContext";

const pointerDown = { button: 0, buttons: 1 } as PointerEvent;
const pointerUp = { button: 0, buttons: 0 } as PointerEvent;

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  const pixels = new Uint8Array(9);

  return {
    activeColorIndex: 2,
    activeFrameIndex: 0,
    gridWidth: 3,
    gridHeight: 3,
    readOnly: false,
    paletteLocked: false,
    paletteColorCount: 4,
    getPixelIndex: (cell) => pixels[cell.y * 3 + cell.x] ?? 0,
    dispatch: () => {},
    ...stubStrokeContext(),
    setActiveColorIndex: () => {},
    setActiveTool: () => {},
    ...overrides,
  };
}

describe("lineTool", () => {
  it("paints a single pixel on click (down and up same cell)", () => {
    const ctx = createContext();
    lineTool.onPointerDown?.(pointerDown, { x: 1, y: 1 }, ctx);
    const result = lineTool.onPointerUp?.(pointerUp, { x: 1, y: 1 }, ctx);

    expect(result).toBeInstanceOf(PaintCellsCommand);
    expect((result as PaintCellsCommand).changes).toEqual([
      { x: 1, y: 1, previous: 0, next: 2 },
    ]);
  });

  it("paints a line between down and up cells", () => {
    const ctx = createContext();
    lineTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    const result = lineTool.onPointerUp?.(pointerUp, { x: 2, y: 0 }, ctx);

    expect(result).toBeInstanceOf(PaintCellsCommand);
    expect((result as PaintCellsCommand).changes).toHaveLength(3);
  });

  it("skips when readOnly", () => {
    const ctx = createContext({ readOnly: true });
    lineTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    const result = lineTool.onPointerUp?.(pointerUp, { x: 2, y: 0 }, ctx);
    expect(result).toBeUndefined();
  });

  it("skips off-palette color when palette is locked", () => {
    const ctx = createContext({
      paletteLocked: true,
      activeColorIndex: 5,
      paletteColorCount: 4,
    });
    lineTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    const result = lineTool.onPointerUp?.(pointerUp, { x: 2, y: 0 }, ctx);
    expect(result).toBeUndefined();
  });
});
