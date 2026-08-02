import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui";
import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";
import { PaletteSectionRail } from "./PaletteSectionRail";

function renderRail() {
  return render(
    <TooltipProvider>
      <PaletteSectionRail />
    </TooltipProvider>,
  );
}

describe("PaletteSectionRail", () => {
  beforeEach(() => {
    useUiStore.setState({ palettePanelSection: "swatches" });
  });

  it("renders four section tabs with accessible labels", () => {
    renderRail();

    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionSwatches }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionPresets }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionShading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    ).toBeInTheDocument();
  });

  it("marks the active section with aria-current", () => {
    renderRail();

    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionSwatches }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionPresets }),
    ).not.toHaveAttribute("aria-current");
  });

  it("switches active section on click", () => {
    renderRail();

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    );

    expect(useUiStore.getState().palettePanelSection).toBe("filters");
    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("calls onSectionSelect when a tab is clicked", () => {
    const onSectionSelect = vi.fn();
    render(
      <TooltipProvider>
        <PaletteSectionRail onSectionSelect={onSectionSelect} />
      </TooltipProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionShading }),
    );

    expect(onSectionSelect).toHaveBeenCalledWith("shading");
  });
});
