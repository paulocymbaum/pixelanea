import type { CellCoord } from "@/canvas/coordinates";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { useEditorStore } from "@/state/editorStore";
import { ensureFrameCached, writeFramePixels } from "@/state/frameCache";
import {
  EDITOR_FIXTURE_PROJECT_ID,
  resetEditor,
} from "@/qa/editorFixtures";
import { buildToolContextFromStore } from "@/tools/context";
import { eraserTool } from "@/tools/eraserTool";
import { eyedropperTool } from "@/tools/eyedropperTool";
import { fillTool } from "@/tools/fillTool";
import { lineTool } from "@/tools/lineTool";
import { paintTool } from "@/tools/paintTool";
import type { Tool, ToolContext } from "@/tools/types";
import { StrokeSession } from "@/tools/strokeSession";

export const MATRIX_PROJECT_ID = EDITOR_FIXTURE_PROJECT_ID;

export function pointerEvent(button = 0, buttons = 1): PointerEvent {
  return { button, buttons } as PointerEvent;
}

export function resetPaintProject(
  overrides: Parameters<typeof resetEditor>[0] = {},
): void {
  resetEditor(overrides);
}

export function buildToolContext(): ToolContext {
  return buildToolContextFromStore();
}

export function pixelAt(x: number, y: number): number {
  const state = useEditorStore.getState();
  return state.pixels[y * state.gridWidth + x] ?? 0;
}

export function setPixel(x: number, y: number, index: number): void {
  const state = useEditorStore.getState();
  const cached = ensureFrameCached(state);
  const pixels = new Uint8Array(
    cached[state.activeFrameIndex] ?? state.pixels,
  );
  pixels[y * state.gridWidth + x] = index;
  useEditorStore.setState({
    pixels,
    framePixelsByIndex: writeFramePixels(
      cached,
      state.activeFrameIndex,
      pixels,
    ),
  });
}

export function runToolStroke(
  tool: Tool,
  cells: CellCoord[],
  options: { endStroke?: boolean } = {},
): void {
  if (cells.length === 0) {
    return;
  }

  const endStroke = options.endStroke ?? true;

  if (tool.id === "paint" || tool.id === "eraser") {
    const session = new StrokeSession();
    const ctx = buildToolContext();
    session.begin();
    if (endStroke) {
      ctx.beginStroke();
    }

    for (const cell of cells) {
      if (tool.id === "paint") {
        session.paintCell(cell, ctx);
      } else {
        session.eraseCell(cell, ctx);
      }
      session.preview(ctx);
    }

    if (endStroke) {
      session.commit(ctx);
      ctx.endStroke();
    }
    return;
  }

  const ctx = buildToolContext();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    let command: ReturnType<NonNullable<Tool["onPointerMove"]>>;

    if (i === 0) {
      command = tool.onPointerDown?.(pointerEvent(), cell, ctx);
    } else {
      command = tool.onPointerMove?.(pointerEvent(0, 1), cell, ctx);
    }

    if (command) {
      ctx.dispatch(command);
    }
  }

  if (endStroke && tool.onPointerUp) {
    const last = cells[cells.length - 1]!;
    const command = tool.onPointerUp(pointerEvent(0, 0), last, buildToolContext());
    if (command) {
      buildToolContext().dispatch(command);
    }
  }
}

export function paintCells(cells: CellCoord[], colorIndex?: number): void {
  if (colorIndex !== undefined) {
    useEditorStore.setState({ activeColorIndex: colorIndex });
  }
  runToolStroke(paintTool, cells);
}

export function paintCell(x: number, y: number, colorIndex?: number): void {
  paintCells([{ x, y }], colorIndex);
}

export function dispatchPaintCell(
  x: number,
  y: number,
  previous: number,
  next: number,
): void {
  useEditorStore
    .getState()
    .dispatch(new PaintCellsCommand([{ x, y, previous, next }]));
}

export function rowCells(y: number, fromX: number, toX: number): CellCoord[] {
  const cells: CellCoord[] = [];
  const step = fromX <= toX ? 1 : -1;
  for (let x = fromX; step > 0 ? x <= toX : x >= toX; x += step) {
    cells.push({ x, y });
  }
  return cells;
}

export { paintTool, eraserTool, eyedropperTool, fillTool, lineTool };
