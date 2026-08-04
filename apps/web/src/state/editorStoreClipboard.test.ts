import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import { createEmptyPixels } from "@/state/editorStorePlayback";

describe("editorStoreClipboard", () => {
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
      selection: null,
      clipboard: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it("copySelection stores extracted pixels for the current selection", async () => {
    useEditorStore.setState({
      selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
    });

    expect(await useEditorStore.getState().copySelection()).toBe(true);

    const { clipboard } = useEditorStore.getState();
    expect(clipboard).toEqual({
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
    });
    expect(useEditorStore.getState().undoStack).toHaveLength(0);
  });

  it("copySelection is a no-op without a selection", async () => {
    useEditorStore.setState({
      clipboard: { width: 1, height: 1, pixels: new Uint8Array([9]) },
    });

    expect(await useEditorStore.getState().copySelection()).toBe(false);
    expect(useEditorStore.getState().clipboard).toEqual({
      width: 1,
      height: 1,
      pixels: new Uint8Array([9]),
    });
  });

  it("copySelection is blocked when readOnly", async () => {
    useEditorStore.setState({
      readOnly: true,
      selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
    });

    expect(await useEditorStore.getState().copySelection()).toBe(false);
    expect(useEditorStore.getState().clipboard).toBeNull();
  });

  it("cutSelection copies to clipboard and clears source pixels in one undo step", async () => {
    useEditorStore.setState({
      selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
    });

    expect(await useEditorStore.getState().cutSelection()).toBe(true);

    const state = useEditorStore.getState();
    expect(state.clipboard).toEqual({
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
    });
    expect(state.selection).toBeNull();
    expect(state.pixels[0]).toBe(0);
    expect(state.pixels[1]).toBe(0);
    expect(state.pixels[4]).toBe(0);
    expect(state.pixels[5]).toBe(0);
    expect(state.selection).toBeNull();
    expect(state.pastePreview).toEqual({
      originX: 0,
      originY: 0,
      clipboard: {
        width: 2,
        height: 2,
        pixels: new Uint8Array([1, 2, 3, 4]),
      },
    });
    expect(state.undoStack).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pixels[0]).toBe(1);
    expect(useEditorStore.getState().pixels[1]).toBe(2);
    expect(useEditorStore.getState().clipboard).toEqual({
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
    });
  });

  it("cutSelection is a no-op without a selection", async () => {
    expect(await useEditorStore.getState().cutSelection()).toBe(false);
    expect(useEditorStore.getState().undoStack).toHaveLength(0);
  });

  it("cutSelection is blocked when readOnly", async () => {
    useEditorStore.setState({
      readOnly: true,
      selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
    });

    expect(await useEditorStore.getState().cutSelection()).toBe(false);
    expect(useEditorStore.getState().clipboard).toBeNull();
    expect(useEditorStore.getState().undoStack).toHaveLength(0);
  });
});
