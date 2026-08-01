import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { PalettePresetGrid } from "./PalettePresetGrid";

describe("PalettePresetGrid", () => {
  it("renders preset buttons and reports selection", () => {
    const onSelect = vi.fn();
    render(<PalettePresetGrid selectedId="retro" onSelect={onSelect} />);

    expect(screen.getByText(copy.palettePresetRetro)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByText(copy.palettePresetGameboy));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "gameboy" }),
    );
  });

  it("shows swatch preview when requested", () => {
    render(
      <PalettePresetGrid selectedId="gameboy" onSelect={() => {}} showSwatchPreview />,
    );

    expect(screen.getByText(copy.palettePresetGameboy)).toBeInTheDocument();
    const swatches = document.querySelectorAll(".rounded-swatch");
    expect(swatches.length).toBe(4);
  });
});
