import { useCallback, useRef } from "react";
import type { CellCoord } from "@/canvas/coordinates";
import { useEditorStore } from "@/state/editorStore";
import { getTool } from "./registry";
import type { ToolContext } from "./types";

export function useToolInput() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const lastCellRef = useRef<CellCoord | null>(null);

  const buildContext = useCallback((): ToolContext => {
    const state = useEditorStore.getState();
    return {
      activeColorIndex: state.activeColorIndex,
      activeFrameIndex: state.activeFrameIndex,
      gridWidth: state.gridWidth,
      gridHeight: state.gridHeight,
      readOnly: state.readOnly,
      paletteLocked: state.paletteLocked,
      paletteColorCount: state.paletteColors.length,
      getPixelIndex: (cell) =>
        state.pixels[cell.y * state.gridWidth + cell.x] ?? 0,
      dispatch: state.dispatch,
      setActiveColorIndex: state.setActiveColorIndex,
      setActiveTool: state.setActiveTool,
    };
  }, []);

  const runToolHandler = useCallback(
    (
      phase: "onPointerDown" | "onPointerMove" | "onPointerUp",
      event: PointerEvent,
      cell: CellCoord,
    ) => {
      const tool = getTool(activeTool);
      const handler = tool?.[phase];
      if (!handler) {
        return;
      }

      if (phase === "onPointerMove") {
        const last = lastCellRef.current;
        if (last && last.x === cell.x && last.y === cell.y) {
          return;
        }
        lastCellRef.current = cell;
      }

      if (phase === "onPointerDown") {
        lastCellRef.current = cell;
      }

      if (phase === "onPointerUp") {
        lastCellRef.current = null;
      }

      const ctx = buildContext();
      const result = handler(event, cell, ctx);
      if (result) {
        ctx.dispatch(result);
      }
    },
    [activeTool, buildContext],
  );

  return {
    onPointerDown: (event: PointerEvent, cell: CellCoord) => {
      if (event.button !== 0) {
        return;
      }
      runToolHandler("onPointerDown", event, cell);
    },
    onPointerMove: (event: PointerEvent, cell: CellCoord) => {
      runToolHandler("onPointerMove", event, cell);
    },
    onPointerUp: (event: PointerEvent, cell: CellCoord) => {
      runToolHandler("onPointerUp", event, cell);
    },
  };
}
