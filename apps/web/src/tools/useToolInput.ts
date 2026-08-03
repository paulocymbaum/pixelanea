import { useCallback, useRef } from "react";
import type { CellCoord } from "@/canvas/coordinates";
import { useEditorStore } from "@/state/editorStore";
import { buildToolContextFromStore } from "./context";
import { getTool } from "./registry";
import { StrokeSession } from "./strokeSession";

const STROKE_TOOLS = new Set(["paint", "eraser"]);

export function useToolInput() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const lastCellRef = useRef<CellCoord | null>(null);
  const strokeRef = useRef(new StrokeSession());
  const strokeToolRef = useRef<string | null>(null);

  const handleStrokePointerDown = useCallback(
    (cell: CellCoord) => {
      const session = strokeRef.current;
      const ctx = buildToolContextFromStore();
      session.begin();
      strokeToolRef.current = activeTool;
      useEditorStore.getState().setStrokeActive(true);

      if (activeTool === "paint") {
        session.paintCell(cell, ctx);
      } else {
        session.eraseCell(cell, ctx);
      }
      session.preview(ctx);
    },
    [activeTool],
  );

  const handleStrokePointerMove = useCallback(
    (cell: CellCoord) => {
      const session = strokeRef.current;
      if (!session.active) {
        return;
      }

      const ctx = buildToolContextFromStore();
      const strokeTool = strokeToolRef.current;
      if (strokeTool === "paint") {
        session.paintCell(cell, ctx);
      } else if (strokeTool === "eraser") {
        session.eraseCell(cell, ctx);
      }
      session.preview(ctx);
    },
    [],
  );

  const handleStrokePointerUp = useCallback(() => {
    const session = strokeRef.current;
    if (!session.active) {
      return;
    }

    const ctx = buildToolContextFromStore();
    session.commit(ctx);
    strokeToolRef.current = null;
    useEditorStore.getState().setStrokeActive(false);
  }, []);

  const runToolHandler = useCallback(
    (
      phase: "onPointerDown" | "onPointerMove" | "onPointerUp",
      event: PointerEvent,
      cell: CellCoord,
    ) => {
      if (STROKE_TOOLS.has(activeTool)) {
        if (phase === "onPointerDown") {
          lastCellRef.current = cell;
          handleStrokePointerDown(cell);
          return;
        }

        if (phase === "onPointerMove") {
          if ((event.buttons & 1) === 0) {
            return;
          }
          const last = lastCellRef.current;
          if (last && last.x === cell.x && last.y === cell.y) {
            return;
          }
          lastCellRef.current = cell;
          handleStrokePointerMove(cell);
          return;
        }

        if (phase === "onPointerUp") {
          lastCellRef.current = null;
          handleStrokePointerUp();
        }
        return;
      }

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

      const ctx = buildToolContextFromStore();
      const result = handler(event, cell, ctx);
      if (result) {
        ctx.dispatch(result);
      }
    },
    [
      activeTool,
      handleStrokePointerDown,
      handleStrokePointerMove,
      handleStrokePointerUp,
    ],
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
