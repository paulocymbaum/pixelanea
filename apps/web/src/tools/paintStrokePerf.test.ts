import { describe, expect, it } from "vitest";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { useEditorStore } from "@/state/editorStore";
import {
  paintCells,
  resetPaintProject,
  rowCells,
} from "@/qa/paintMatrixHarness";

/** Max preview batches allowed for a single 64-cell horizontal stroke. */
const MAX_PREVIEW_BATCHES_PER_STROKE = 64;

describe("paint stroke performance", () => {
  it("commits one undo step and bounded preview batches for a 64-cell stroke", () => {
    resetPaintProject({ gridWidth: 64, gridHeight: 64 });

    let previewBatches = 0;
    const previewCells = useEditorStore.getState().previewCells;
    useEditorStore.setState({
      previewCells: (changes) => {
        previewBatches += 1;
        previewCells(changes);
      },
    });

    paintCells(rowCells(0, 0, 63));

    const { undoStack } = useEditorStore.getState();
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0]).toBeInstanceOf(PaintCellsCommand);
    expect((undoStack[0] as PaintCellsCommand).changes.length).toBe(64);
    expect(previewBatches).toBeLessThanOrEqual(MAX_PREVIEW_BATCHES_PER_STROKE);
    expect(previewBatches).toBeGreaterThan(0);
  });
});
