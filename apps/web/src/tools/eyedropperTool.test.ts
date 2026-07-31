import { describe, expect, it, vi } from "vitest";
import { eyedropperTool } from "./eyedropperTool";
import type { ToolContext } from "./types";

const pointerDown = { button: 0, buttons: 1 } as PointerEvent;

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  const pixels = new Uint8Array(4);

  return {
    activeColorIndex: 0,
    activeFrameIndex: 0,
    gridWidth: 2,
    gridHeight: 2,
    readOnly: false,
    paletteLocked: false,
    paletteColorCount: 4,
    getPixelIndex: (cell) => pixels[cell.y * 2 + cell.x] ?? 0,
    dispatch: () => {},
    setActiveColorIndex: () => {},
    setActiveTool: () => {},
    ...overrides,
  };
}

describe("eyedropperTool", () => {
  it("sets active color and switches to paint on pointer down", () => {
    const setActiveColorIndex = vi.fn();
    const setActiveTool = vi.fn();
    const ctx = createContext({
      getPixelIndex: () => 3,
      setActiveColorIndex,
      setActiveTool,
    });

    eyedropperTool.onPointerDown?.(pointerDown, { x: 1, y: 0 }, ctx);

    expect(setActiveColorIndex).toHaveBeenCalledWith(3);
    expect(setActiveTool).toHaveBeenCalledWith("paint");
  });

  it("skips color pick and tool switch when readOnly", () => {
    const setActiveColorIndex = vi.fn();
    const setActiveTool = vi.fn();
    const ctx = createContext({
      readOnly: true,
      setActiveColorIndex,
      setActiveTool,
    });

    eyedropperTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);

    expect(setActiveColorIndex).not.toHaveBeenCalled();
    expect(setActiveTool).not.toHaveBeenCalled();
  });
});
