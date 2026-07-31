import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { useEditorStore } from "./editorStore";

describe("editorStore palette actions", () => {
  beforeEach(() => {
    useEditorStore.setState({
      paletteColors: [...DEFAULT_PALETTE_COLORS],
      activeColorIndex: 1,
      pixels: new Uint8Array(4),
      isPaletteDirty: false,
      isDirty: false,
    });
  });

  it("adds a palette color and marks palette dirty", () => {
    useEditorStore.getState().addPaletteColor("#AABBCC");

    const state = useEditorStore.getState();
    expect(state.paletteColors).toContain("#AABBCC");
    expect(state.activeColorIndex).toBe(state.paletteColors.length - 1);
    expect(state.isPaletteDirty).toBe(true);
  });

  it("updates an existing palette color", () => {
    useEditorStore.getState().updatePaletteColor(1, "#123456");

    const state = useEditorStore.getState();
    expect(state.paletteColors[1]).toBe("#123456");
    expect(state.isPaletteDirty).toBe(true);
  });

  it("removes a palette color and remaps pixels", () => {
    useEditorStore.setState({
      pixels: new Uint8Array([0, 2, 1, 0]),
      activeColorIndex: 2,
    });

    useEditorStore.getState().removePaletteColor(1);

    const state = useEditorStore.getState();
    expect(state.paletteColors.length).toBe(DEFAULT_PALETTE_COLORS.length - 1);
    expect(Array.from(state.pixels)).toEqual([0, 1, 0, 0]);
    expect(state.activeColorIndex).toBe(1);
    expect(state.isDirty).toBe(true);
    expect(state.isPaletteDirty).toBe(true);
  });

  it("does not remove the last palette color", () => {
    useEditorStore.setState({ paletteColors: ["#000000"] });

    useEditorStore.getState().removePaletteColor(0);

    expect(useEditorStore.getState().paletteColors).toEqual(["#000000"]);
  });
});
