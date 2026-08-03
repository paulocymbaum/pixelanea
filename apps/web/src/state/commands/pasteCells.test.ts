import { describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import {
  buildPasteCellChanges,
  PasteCellsCommand,
} from "./pasteCells";
import { TRANSPARENT_INDEX } from "./types";

describe("buildPasteCellChanges", () => {
  it("skips cells that fall outside the grid", () => {
    const pixels = new Uint8Array(9);
    const clipboard = {
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
    };

    const changes = buildPasteCellChanges(clipboard, 2, 2, pixels, 3, 3);

    expect(changes).toEqual([
      { x: 2, y: 2, previous: TRANSPARENT_INDEX, next: 1 },
    ]);
  });

  it("includes transparent clipboard cells so they overwrite destination", () => {
    const pixels = new Uint8Array([5]);
    const clipboard = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([TRANSPARENT_INDEX]),
    };

    const changes = buildPasteCellChanges(clipboard, 0, 0, pixels, 1, 1);

    expect(changes).toEqual([
      { x: 0, y: 0, previous: 5, next: TRANSPARENT_INDEX },
    ]);
  });
});

describe("PasteCellsCommand", () => {
  it("applies and reverts a full paste in one step", () => {
    const pixels = new Uint8Array(9);
    const command = new PasteCellsCommand([
      { x: 0, y: 0, previous: TRANSPARENT_INDEX, next: 1 },
      { x: 1, y: 0, previous: TRANSPARENT_INDEX, next: 2 },
      { x: 0, y: 1, previous: TRANSPARENT_INDEX, next: 3 },
    ]);

    command.apply(pixels, 3);
    expect(pixels[0]).toBe(1);
    expect(pixels[1]).toBe(2);
    expect(pixels[3]).toBe(3);

    command.revert(pixels, 3);
    expect(pixels[0]).toBe(TRANSPARENT_INDEX);
    expect(pixels[1]).toBe(TRANSPARENT_INDEX);
    expect(pixels[3]).toBe(TRANSPARENT_INDEX);
  });

  it("round-trips through editor undo", () => {
    useEditorStore.setState({
      gridWidth: 3,
      gridHeight: 3,
      pixels: new Uint8Array(9),
      undoStack: [],
      redoStack: [],
      readOnly: false,
    });

    const command = new PasteCellsCommand([
      { x: 1, y: 1, previous: TRANSPARENT_INDEX, next: 4 },
    ]);

    useEditorStore.getState().dispatch(command);
    expect(useEditorStore.getState().pixels[4]).toBe(4);
    expect(useEditorStore.getState().undoStack).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pixels[4]).toBe(TRANSPARENT_INDEX);
    expect(useEditorStore.getState().undoStack).toHaveLength(0);
  });
});
