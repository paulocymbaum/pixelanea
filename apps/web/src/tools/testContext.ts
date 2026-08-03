import type { ToolContext } from "./types";
import { buildToolContextFromStore } from "./context";

export function stubStrokeContext(
  overrides: Partial<ToolContext> = {},
): Pick<ToolContext, "previewCells" | "beginStroke" | "endStroke"> {
  const base = buildToolContextFromStore();
  return {
    previewCells: base.previewCells,
    beginStroke: base.beginStroke,
    endStroke: base.endStroke,
    ...overrides,
  };
}
