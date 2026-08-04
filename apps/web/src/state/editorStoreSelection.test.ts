import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";

describe("nudgeSelection", () => {
  beforeEach(() => {
    useEditorStore.setState({
      gridWidth: 8,
      gridHeight: 8,
      selection: { x: 2, y: 2, width: 3, height: 2, shape: "rect" },
      pastePreview: null,
      movePreview: null,
    });
  });

  it("offsets the selection bbox by one cell", () => {
    useEditorStore.getState().nudgeSelection(1, 0);
    expect(useEditorStore.getState().selection).toEqual({
      x: 3,
      y: 2,
      width: 3,
      height: 2,
      shape: "rect",
    });
  });

  it("clamps at grid edges", () => {
    useEditorStore.setState({
      selection: { x: 5, y: 6, width: 3, height: 2, shape: "rect" },
    });
    useEditorStore.getState().nudgeSelection(1, 1);
    expect(useEditorStore.getState().selection).toEqual({
      x: 5,
      y: 6,
      width: 3,
      height: 2,
      shape: "rect",
    });
  });
});
