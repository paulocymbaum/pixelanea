import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { DEFAULT_COLOR_FILTER_SETTINGS } from "@/lib/colorFilters";
import { useSessionStore } from "@/state/sessionStore";
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
    useSessionStore.setState({ palettePanelSection: "swatches" });
    useEditorStore.setState({
      colorFilters: DEFAULT_COLOR_FILTER_SETTINGS,
    });
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

    expect(useSessionStore.getState().palettePanelSection).toBe("filters");
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

  it("announces active filters on the Filters tab", () => {
    useEditorStore.setState({
      colorFilters: {
        ...DEFAULT_COLOR_FILTER_SETTINGS,
        overlayEnabled: true,
        overlayOpacity: 0.5,
      },
    });

    renderRail();

    const filtersButton = screen.getByRole("button", {
      name: copy.palettePanelSectionFiltersActive,
    });
    expect(filtersButton).toBeInTheDocument();
    expect(
      filtersButton.querySelector('[data-testid="filter-active-badge"]'),
    ).toBeInTheDocument();
  });

  it("hides filter badge when filters are inactive", () => {
    renderRail();

    const filtersButton = screen.getByRole("button", {
      name: copy.palettePanelSectionFilters,
    });
    expect(
      filtersButton.querySelector('[data-testid="filter-active-badge"]'),
    ).not.toBeInTheDocument();
  });
});
