import type { ToolId } from "@/content/tools";
import { eraserTool } from "./eraserTool";
import { eyedropperTool } from "./eyedropperTool";
import { fillTool } from "./fillTool";
import { lineTool } from "./lineTool";
import { paintTool } from "./paintTool";
import type { Tool } from "./types";

const tools: Partial<Record<ToolId, Tool>> = {
  paint: paintTool,
  eraser: eraserTool,
  eyedropper: eyedropperTool,
  fill: fillTool,
  line: lineTool,
};

export function getTool(id: ToolId): Tool | undefined {
  return tools[id];
}

export function getToolCursor(id: ToolId): string {
  return tools[id]?.cursor ?? "default";
}
