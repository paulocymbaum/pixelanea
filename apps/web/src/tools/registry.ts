import { eraserTool } from "./eraserTool";
import { eyedropperTool } from "./eyedropperTool";
import { fillTool } from "./fillTool";
import { handTool } from "./handTool";
import { lineTool } from "./lineTool";
import { paintTool } from "./paintTool";
import type { Tool } from "./types";

const toolRegistry = {
  paint: paintTool,
  eraser: eraserTool,
  eyedropper: eyedropperTool,
  fill: fillTool,
  line: lineTool,
  hand: handTool,
} satisfies Record<string, Tool>;

export type ToolId = keyof typeof toolRegistry;

export const PAINT_TOOL_IDS: readonly ToolId[] = Object.keys(
  toolRegistry,
) as ToolId[];

export function getTool(id: ToolId): Tool {
  return toolRegistry[id];
}

export function getToolCursor(id: ToolId): string {
  return toolRegistry[id].cursor;
}
