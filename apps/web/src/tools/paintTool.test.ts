import { describe, expect, it } from "vitest";
import { PaintCellCommand } from "@/state/commands/paintCell";
import { paintTool } from "./paintTool";
import type { ToolContext } from "./types";

const pointerDown = { button: 0, buttons: 1 } as PointerEvent;

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  const pixels = new Uint8Array(4);
  const commands: import("@/state/commands/types").Command[] = [];

  return {
    activeColorIndex: 2,
    activeFrameIndex: 0,
    gridWidth: 2,
    gridHeight: 2,
    readOnly: false,
    paletteLocked: false,
    paletteColorCount: 4,
    getPixelIndex: (cell) => pixels[cell.y * 2 + cell.x] ?? 0,
    dispatch: (command) => {
      const list = Array.isArray(command) ? command : [command];
      commands.push(...list);
      for (const cmd of list) {
        cmd.apply(pixels, 2);
      }
    },
    setActiveColorIndex: () => {},
    setActiveTool: () => {},
    ...overrides,
  };
}

describe("paintTool", () => {
  it("paints on pointer down when color changes", () => {
    const ctx = createContext();
    const result = paintTool.onPointerDown?.(
      pointerDown,
      { x: 1, y: 0 },
      ctx,
    );

    expect(result).toBeInstanceOf(PaintCellCommand);
    expect((result as PaintCellCommand).next).toBe(2);
  });

  it("skips when readOnly", () => {
    const ctx = createContext({ readOnly: true });
    const result = paintTool.onPointerDown?.(
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
    const result = paintTool.onPointerDown?.(
      pointerDown,
      { x: 0, y: 0 },
      ctx,
    );
    expect(result).toBeUndefined();
  });
});
