import type { CellCoord } from "@/canvas/coordinates";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import type { ToolId } from "@/tools/registry";
import type { Command } from "@/state/commands/types";
import type { CellChange } from "@/state/commands/paintCells";

export type ToolContext = {
  activeColorIndex: number;
  activeFrameIndex: number;
  gridWidth: number;
  gridHeight: number;
  readOnly: boolean;
  paletteLocked: boolean;
  paletteColorCount: number;
  getPixelIndex: (cell: CellCoord) => number;
  dispatch: (command: Command | Command[]) => void;
  previewCells: (changes: readonly CellChange[]) => void;
  beginStroke: () => void;
  endStroke: () => void;
  setActiveColorIndex: (index: number) => void;
  setActiveTool: (tool: ToolId) => void;
  setSelection: (selection: SelectionRect | null) => void;
  setSelectionPreview: (selection: SelectionRect | null) => void;
};

export interface Tool {
  id: string;
  cursor: string;
  onPointerDown?: (
    event: PointerEvent,
    cell: CellCoord,
    ctx: ToolContext,
  ) => Command | Command[] | void;
  onPointerMove?: (
    event: PointerEvent,
    cell: CellCoord,
    ctx: ToolContext,
  ) => Command | Command[] | void;
  onPointerUp?: (
    event: PointerEvent,
    cell: CellCoord,
    ctx: ToolContext,
  ) => Command | Command[] | void;
}
