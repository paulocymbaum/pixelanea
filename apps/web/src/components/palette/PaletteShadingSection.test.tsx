import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { useEditorStore } from "@/state/editorStore";
import { PaletteShadingSection } from "./PaletteShadingSection";

describe("PaletteShadingSection", () => {
  beforeEach(() => {
    useEditorStore.setState({
      paletteColors: [...DEFAULT_PALETTE_COLORS],
      activeColorIndex: 0,
      paletteLocked: false,
      isPaletteDirty: false,
    });
  });

  it("adds a generated shade to the palette", () => {
    render(<PaletteShadingSection />);

    const initialCount = useEditorStore.getState().paletteColors.length;
    fireEvent.click(screen.getAllByRole("option")[0]);

    const state = useEditorStore.getState();
    expect(state.paletteColors.length).toBe(initialCount + 1);
    expect(state.isPaletteDirty).toBe(true);
  });

  it("does not add shades when palette is locked", () => {
    useEditorStore.setState({ paletteLocked: true });
    render(<PaletteShadingSection />);

    const initialCount = useEditorStore.getState().paletteColors.length;
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(useEditorStore.getState().paletteColors.length).toBe(initialCount);
  });
});
