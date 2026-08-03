import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { useEditorStore } from "./editorStore";

describe("editorStore palette presets and lock", () => {
  beforeEach(() => {
    useEditorStore.setState({
      paletteColors: [...DEFAULT_PALETTE_COLORS],
      activeColorIndex: 1,
      paletteLocked: false,
      isPaletteDirty: false,
    });
  });

  it("applies a palette preset", () => {
    useEditorStore.getState().applyPalettePreset(["#111111", "#EEEEEE"]);

    const state = useEditorStore.getState();
    expect(state.paletteColors).toEqual(["#111111", "#EEEEEE"]);
    expect(state.isPaletteDirty).toBe(true);
    expect(state.undoStack).toHaveLength(1);
  });

  it("undoes palette preset apply", () => {
    const original = [...DEFAULT_PALETTE_COLORS];
    useEditorStore.setState({
      paletteColors: original,
      activeColorIndex: 1,
      undoStack: [],
    });

    useEditorStore.getState().applyPalettePreset(["#111111", "#EEEEEE"]);
    useEditorStore.getState().undo();

    const state = useEditorStore.getState();
    expect(state.paletteColors).toEqual(original);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
  });

  it("rejects preset apply when locked", () => {
    useEditorStore.setState({ paletteLocked: true });
    useEditorStore.getState().applyPalettePreset(["#111111"]);

    expect(useEditorStore.getState().paletteColors).toEqual([
      ...DEFAULT_PALETTE_COLORS,
    ]);
  });

  it("blocks palette mutations when locked", () => {
    useEditorStore.setState({ paletteLocked: true });
    useEditorStore.getState().addPaletteColor("#AABBCC");

    expect(useEditorStore.getState().paletteColors.length).toBe(
      DEFAULT_PALETTE_COLORS.length,
    );
  });
});
