import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { PaletteQuickPresets } from "./PaletteQuickPresets";

describe("PaletteQuickPresets", () => {
  beforeEach(() => {
    useEditorStore.setState({
      paletteColors: [...DEFAULT_PALETTE_COLORS],
      paletteLocked: false,
      isPaletteDirty: false,
    });
    useSessionStore.setState({
      lastPalettePreset: null,
      palettePanelSection: "swatches",
    });
  });

  it("renders all quick preset chips and see-all link", () => {
    render(<PaletteQuickPresets />);

    expect(screen.getByText(copy.paletteQuickPresetsLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.paletteQuickPresetsSeeAll })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.palettePresetRetro })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.palettePresetGameboy })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.palettePresetPico8 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.palettePresetPastel })).toBeInTheDocument();
  });

  it("shows original image chip when source palette is stored", () => {
    useEditorStore.setState({
      sourcePaletteColors: ["#AABBCC", "#112233"],
    });
    render(<PaletteQuickPresets />);

    expect(
      screen.getByRole("button", { name: copy.palettePresetSource }),
    ).toBeInTheDocument();
  });

  it("applies a preset and records last preset", () => {
    render(<PaletteQuickPresets />);
    fireEvent.click(screen.getByRole("button", { name: copy.palettePresetGameboy }));

    expect(useEditorStore.getState().paletteColors).toEqual([
      "#0F380F",
      "#306230",
      "#8BAC0F",
      "#9BBC0F",
    ]);
    expect(useSessionStore.getState().lastPalettePreset).toBe("gameboy");
  });

  it("navigates to presets tab via see-all", () => {
    render(<PaletteQuickPresets />);
    fireEvent.click(screen.getByRole("button", { name: copy.paletteQuickPresetsSeeAll }));

    expect(useSessionStore.getState().palettePanelSection).toBe("presets");
  });

  it("disables chips when palette is locked", () => {
    useEditorStore.setState({ paletteLocked: true });
    render(<PaletteQuickPresets />);

    expect(screen.getByRole("button", { name: copy.palettePresetRetro })).toBeDisabled();
  });
});
