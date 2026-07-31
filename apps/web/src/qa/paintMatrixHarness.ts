import type { CellCoord } from "@/canvas/coordinates";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { PaintCellCommand } from "@/state/commands/paintCell";
import { useEditorStore } from "@/state/editorStore";
import { eraserTool } from "@/tools/eraserTool";
import { eyedropperTool } from "@/tools/eyedropperTool";
import { fillTool } from "@/tools/fillTool";
import { lineTool } from "@/tools/lineTool";
import { paintTool } from "@/tools/paintTool";
import type { Tool, ToolContext } from "@/tools/types";

export const MATRIX_PROJECT_ID = "matrix-project";

export function pointerEvent(button = 0, buttons = 1): PointerEvent {
  return { button, buttons } as PointerEvent;
}

export function resetPaintProject(
  overrides: Partial<ReturnType<typeof useEditorStore.getState>> = {},
): void {
  const width = overrides.gridWidth ?? 32;
  const height = overrides.gridHeight ?? 32;
  const pixels =
    overrides.pixels ?? new Uint8Array(width * height);

  useEditorStore.setState({
    projectId: MATRIX_PROJECT_ID,
    projectName: "Matrix project",
    activeTool: "paint",
    activeColorIndex: 1,
    activeFrameIndex: 0,
    frameCount: 1,
    gridWidth: width,
    gridHeight: height,
    pixels: new Uint8Array(pixels),
    paletteColors: DEFAULT_PALETTE_COLORS,
    paletteLocked: false,
    readOnly: false,
    isPlaying: false,
    placingLighting: false,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    framePixelsByIndex: { 0: new Uint8Array(pixels) },
    frameSyncStatus: "idle",
    paletteSyncStatus: "idle",
    syncStatus: "idle",
    frameSyncError: null,
    paletteSyncError: null,
    syncError: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    ...overrides,
  });
}

export function buildToolContext(): ToolContext {
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
}

export function pixelAt(x: number, y: number): number {
  const state = useEditorStore.getState();
  return state.pixels[y * state.gridWidth + x] ?? 0;
}

export function setPixel(x: number, y: number, index: number): void {
  const state = useEditorStore.getState();
  const pixels = new Uint8Array(state.pixels);
  pixels[y * state.gridWidth + x] = index;
  useEditorStore.setState({ pixels });
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
  runToolStroke(paintTool, cells, { endStroke: false });
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
  useEditorStore.getState().dispatch(new PaintCellCommand(x, y, previous, next));
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
