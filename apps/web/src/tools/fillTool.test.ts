import { describe, expect, it } from "vitest";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { fillTool } from "./fillTool";
import type { ToolContext } from "./types";
import { stubStrokeContext } from "./testContext";

const pointerDown = { button: 0, buttons: 1 } as PointerEvent;

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  const pixels = new Uint8Array(9);
  pixels[0] = 1;
  pixels[1] = 1;
  pixels[3] = 1;

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

describe("fillTool", () => {
  it("fills a connected region on pointer down", () => {
    const ctx = createContext();
    const result = fillTool.onPointerDown?.(
      pointerDown,
      { x: 0, y: 0 },
      ctx,
    );

    expect(result).toBeInstanceOf(PaintCellsCommand);
    expect((result as PaintCellsCommand).changes).toHaveLength(3);
    expect((result as PaintCellsCommand).changes.every((c) => c.next === 2)).toBe(
      true,
    );
  });

  it("skips when readOnly", () => {
    const ctx = createContext({ readOnly: true });
    const result = fillTool.onPointerDown?.(
      pointerDown,
      { x: 0, y: 0 },
      ctx,
    );
    expect(result).toBeUndefined();
  });

  it("skips when fill color matches target", () => {
    const ctx = createContext({ activeColorIndex: 1 });
    const result = fillTool.onPointerDown?.(
      pointerDown,
      { x: 0, y: 0 },
      ctx,
    );
    expect(result).toBeUndefined();
  });

  it("skips off-palette color when palette is locked", () => {
    const ctx = createContext({
      paletteLocked: true,
      activeColorIndex: 5,
      paletteColorCount: 4,
    });
    const result = fillTool.onPointerDown?.(
      pointerDown,
      { x: 0, y: 0 },
      ctx,
    );
    expect(result).toBeUndefined();
  });
});
