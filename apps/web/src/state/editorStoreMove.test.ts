import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import { createEmptyPixels } from "@/state/editorStorePlayback";

describe("editorStoreMove", () => {
  beforeEach(() => {
    const pixels = createEmptyPixels(4, 4);
    pixels[0] = 1;
    pixels[1] = 2;
    pixels[4] = 3;
    pixels[5] = 4;

    useEditorStore.setState({
      gridWidth: 4,
      gridHeight: 4,
      pixels,
      readOnly: false,
      selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
      movePreview: null,
      pastePreview: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it("startMovePreview captures clipboard at selection origin", () => {
    expect(useEditorStore.getState().startMovePreview()).toBe(true);
    const preview = useEditorStore.getState().movePreview;
    expect(preview?.originX).toBe(0);
    expect(preview?.originY).toBe(0);
    expect(preview?.clipboard.pixels).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("commitMove applies pixels at nudged origin in one undo step", async () => {
    useEditorStore.getState().startMovePreview();
    useEditorStore.getState().moveMovePreview(1, 0);

    expect(await useEditorStore.getState().commitMove()).toBe(true);

    const state = useEditorStore.getState();
    expect(state.pixels[0]).toBe(0);
    expect(state.pixels[1]).toBe(1);
    expect(state.pixels[2]).toBe(2);
    expect(state.pixels[5]).toBe(3);
    expect(state.pixels[6]).toBe(4);
    expect(state.selection).toBeNull();
    expect(state.undoStack).toHaveLength(1);
  });
});
