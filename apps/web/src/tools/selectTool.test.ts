import { beforeEach, describe, expect, it } from "vitest";
import {
  bindSelectionModifierKeys,
  resetCKeyHeld,
} from "@/canvas/selectionModifiers";
import { resetSelectAnchor, selectTool } from "./selectTool";
import type { ToolContext } from "./types";
import { stubStrokeContext } from "./testContext";

const pointerDown = { button: 0, buttons: 1, shiftKey: false } as PointerEvent;
const pointerUp = { button: 0, buttons: 0, shiftKey: false } as PointerEvent;

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  const pixels = new Uint8Array(9);

  return {
    activeColorIndex: 1,
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
    setSelection: () => {},
    setSelectionPreview: () => {},
    ...overrides,
  };
}

describe("selectTool", () => {
  beforeEach(() => {
    resetSelectAnchor();
    resetCKeyHeld();
  });

  it("commits a 1x1 selection on click", () => {
    let committed: import("@/canvas/selectionGeometry").SelectionRect | null =
      null;
    const ctx = createContext({
      setSelection: (selection) => {
        committed = selection;
      },
    });

    selectTool.onPointerDown?.(pointerDown, { x: 1, y: 1 }, ctx);
    selectTool.onPointerUp?.(pointerUp, { x: 1, y: 1 }, ctx);

    expect(committed).toEqual({
      x: 1,
      y: 1,
      width: 1,
      height: 1,
      shape: "rect",
    });
  });

  it("commits a normalized rectangle between down and up cells", () => {
    let committed: import("@/canvas/selectionGeometry").SelectionRect | null =
      null;
    const ctx = createContext({
      setSelection: (selection) => {
        committed = selection;
      },
    });

    selectTool.onPointerDown?.(pointerDown, { x: 2, y: 2 }, ctx);
    selectTool.onPointerUp?.(pointerUp, { x: 0, y: 0 }, ctx);

    expect(committed).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      shape: "rect",
    });
  });

  it("skips when readOnly", () => {
    let committed = false;
    const ctx = createContext({
      readOnly: true,
      setSelection: () => {
        committed = true;
      },
    });

    selectTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    selectTool.onPointerUp?.(pointerUp, { x: 2, y: 2 }, ctx);

    expect(committed).toBe(false);
  });

  it("commits a square selection when shift is held", () => {
    let committed: import("@/canvas/selectionGeometry").SelectionRect | null =
      null;
    const ctx = createContext({
      setSelection: (selection) => {
        committed = selection;
      },
    });

    selectTool.onPointerDown?.(pointerDown, { x: 1, y: 1 }, ctx);
    selectTool.onPointerUp?.(
      { ...pointerUp, shiftKey: true } as PointerEvent,
      { x: 4, y: 2 },
      ctx,
    );

    expect(committed).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 4,
      shape: "square",
    });
  });

  it("commits an ellipse selection when shift and c are held", () => {
    let committed: import("@/canvas/selectionGeometry").SelectionRect | null =
      null;
    const ctx = createContext({
      setSelection: (selection) => {
        committed = selection;
      },
    });

    const unbind = bindSelectionModifierKeys();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));

    selectTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    selectTool.onPointerUp?.(
      { ...pointerUp, shiftKey: true } as PointerEvent,
      { x: 4, y: 4 },
      ctx,
    );

    unbind();
    resetCKeyHeld();

    expect(committed).toEqual({
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      shape: "ellipse",
    });
  });

  it("clears preview on pointer down", () => {
    let previewCleared = false;
    const ctx = createContext({
      setSelectionPreview: (preview) => {
        if (preview === null) {
          previewCleared = true;
        }
      },
    });

    selectTool.onPointerDown?.(pointerDown, { x: 0, y: 0 }, ctx);
    expect(previewCleared).toBe(true);
  });
});
