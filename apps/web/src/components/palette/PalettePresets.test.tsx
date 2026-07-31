import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { PalettePresets } from "./PalettePresets";

describe("PalettePresets", () => {
  beforeEach(() => {
    useEditorStore.setState({
      paletteColors: [...DEFAULT_PALETTE_COLORS],
      paletteLocked: false,
      isPaletteDirty: false,
    });
  });

  it("renders preset buttons", () => {
    render(<PalettePresets />);
    expect(screen.getByText(copy.palettePresetRetro)).toBeInTheDocument();
    expect(screen.getByText(copy.palettePresetGameboy)).toBeInTheDocument();
    expect(screen.getByText(copy.palettePresetMonochrome)).toBeInTheDocument();
  });

  it("applies a preset to the store", () => {
    render(<PalettePresets />);
    fireEvent.click(screen.getByText(copy.palettePresetGameboy));

    const state = useEditorStore.getState();
    expect(state.paletteColors).toEqual([
      "#0F380F",
      "#306230",
      "#8BAC0F",
      "#9BBC0F",
    ]);
    expect(state.isPaletteDirty).toBe(true);
  });

  it("disables presets when palette is locked", () => {
    useEditorStore.setState({ paletteLocked: true });
    render(<PalettePresets />);
    expect(screen.getByText(copy.palettePresetRetro)).toBeDisabled();
  });
});
