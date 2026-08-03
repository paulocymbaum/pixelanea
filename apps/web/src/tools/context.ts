import { useEditorStore } from "@/state/editorStore";
import { getStrokePreviewIndex } from "./strokePreview";
import type { ToolContext } from "./types";

/** Single source for live editor → tool context wiring. */
export function buildToolContextFromStore(
  overrides: Partial<ToolContext> = {},
): ToolContext {
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
      getStrokePreviewIndex(cell, state.gridWidth, state.pixels),
    dispatch: state.dispatch,
    previewCells: state.previewCells,
    beginStroke: () => state.setStrokeActive(true),
    endStroke: () => state.setStrokeActive(false),
    setActiveColorIndex: state.setActiveColorIndex,
    setActiveTool: state.setActiveTool,
    ...overrides,
  };
}
