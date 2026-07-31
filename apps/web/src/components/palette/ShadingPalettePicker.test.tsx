import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { ShadingPalettePicker } from "./ShadingPalettePicker";

describe("ShadingPalettePicker", () => {
  it("renders style tabs and generated shades", () => {
    const onSelectShade = vi.fn();

    render(
      <ShadingPalettePicker baseColor="#808080" onSelectShade={onSelectShade} />,
    );

    expect(screen.getByText(copy.paletteShadingSectionLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: copy.paletteShadingStyleLighting }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("switches style and calls onSelectShade when a shade is clicked", () => {
    const onSelectShade = vi.fn();

    render(
      <ShadingPalettePicker baseColor="#4488CC" onSelectShade={onSelectShade} />,
    );

    fireEvent.click(
      screen.getByRole("tab", { name: copy.paletteShadingStyleCellShading }),
    );
    expect(
      screen.getByRole("tab", { name: copy.paletteShadingStyleCellShading }),
    ).toHaveAttribute("aria-selected", "true");

    const firstShade = screen.getAllByRole("option")[0];
    fireEvent.click(firstShade);

    expect(onSelectShade).toHaveBeenCalledTimes(1);
    expect(onSelectShade.mock.calls[0][0]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("disables interaction when disabled", () => {
    render(
      <ShadingPalettePicker
        baseColor="#808080"
        onSelectShade={vi.fn()}
        disabled
      />,
    );

    expect(
      screen.getByRole("tab", { name: copy.paletteShadingStyleDark }),
    ).toBeDisabled();
    expect(screen.getAllByRole("option")[0]).toBeDisabled();
  });
});
