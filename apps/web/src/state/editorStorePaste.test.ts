import { beforeEach, describe, expect, it } from "vitest";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { useEditorStore } from "@/state/editorStore";

describe("editorStore paste preview", () => {
  const clipboard = {
    width: 2,
    height: 1,
    pixels: new Uint8Array([3, 4]),
  };

  beforeEach(() => {
    useEditorStore.setState({
      gridWidth: 4,
      gridHeight: 4,
      pixels: new Uint8Array(16),
      readOnly: false,
      clipboard,
      selection: { x: 0, y: 0, width: 2, height: 1, shape: "rect" },
      pastePreview: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it("startPastePreview anchors to hover cell", () => {
    useEditorStore.setState({ hoverCell: { x: 2, y: 1 } });

    expect(useEditorStore.getState().startPastePreview()).toBe(true);
    expect(useEditorStore.getState().pastePreview).toEqual({
      originX: 2,
      originY: 1,
      clipboard,
    });
  });

  it("does not start paste when readOnly or clipboard is empty", () => {
    useEditorStore.setState({ readOnly: true });
    expect(useEditorStore.getState().startPastePreview()).toBe(false);

    useEditorStore.setState({ readOnly: false, clipboard: null });
    expect(useEditorStore.getState().startPastePreview()).toBe(false);
  });

  it("movePastePreview updates origin", () => {
    useEditorStore.getState().startPastePreview(1, 1);
    useEditorStore.getState().movePastePreview(3, 2);

    expect(useEditorStore.getState().pastePreview).toEqual({
      originX: 3,
      originY: 2,
      clipboard,
    });
  });

  it("nudgePastePreview offsets origin by delta", () => {
    useEditorStore.getState().startPastePreview(1, 1);
    useEditorStore.getState().nudgePastePreview(2, -1);

    expect(useEditorStore.getState().pastePreview).toEqual({
      originX: 3,
      originY: 0,
      clipboard,
    });
  });

  it("commitPaste dispatches one command and clears selection", () => {
    useEditorStore.getState().startPastePreview(1, 1);
    useEditorStore.getState().commitPaste();

    const state = useEditorStore.getState();
    expect(state.pastePreview).toBeNull();
    expect(state.selection).toBeNull();
    expect(state.undoStack).toHaveLength(1);
    expect(state.pixels[1 * 4 + 1]).toBe(3);
    expect(state.pixels[1 * 4 + 2]).toBe(4);
    expect(state.clipboard).toEqual(clipboard);
  });

  it("cancelPaste clears preview without undo entry", () => {
    useEditorStore.getState().startPastePreview(0, 0);
    useEditorStore.getState().cancelPaste();

    expect(useEditorStore.getState().pastePreview).toBeNull();
    expect(useEditorStore.getState().undoStack).toHaveLength(0);
    expect(useEditorStore.getState().selection).not.toBeNull();
  });

  it("commitPaste with fully out-of-bounds origin clears selection without undo", () => {
    useEditorStore.getState().startPastePreview(10, 10);
    useEditorStore.getState().commitPaste();

    expect(useEditorStore.getState().undoStack).toHaveLength(0);
    expect(useEditorStore.getState().selection).toBeNull();
    expect(statePixelsUnchanged()).toBe(true);
  });
});

function statePixelsUnchanged(): boolean {
  const { pixels } = useEditorStore.getState();
  return pixels.every((value) => value === TRANSPARENT_INDEX);
}
