import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { RightPalettePanel } from "./RightPalettePanel";

function renderPanel() {
  return render(
    <TooltipProvider>
      <RightPalettePanel />
    </TooltipProvider>,
  );
}

describe("RightPalettePanel", () => {
  beforeEach(() => {
    useUiStore.setState({ paletteCollapsed: false, palettePanelSection: "swatches" });
    useEditorStore.setState({ projectId: "p1" });
  });

  it("shows only the active section content when expanded", () => {
    renderPanel();

    expect(screen.getByRole("listbox", { name: "Palette colors" })).toBeInTheDocument();
    expect(screen.queryByText(copy.palettePresetsLabel)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionPresets }),
    );

    expect(screen.getByText(copy.palettePresetsLabel)).toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "Palette colors" }),
    ).not.toBeInTheDocument();
  });

  it("shows section icons when collapsed and expands on icon click", () => {
    useUiStore.setState({ paletteCollapsed: true, palettePanelSection: "swatches" });
    renderPanel();

    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    );

    expect(useUiStore.getState().paletteCollapsed).toBe(false);
    expect(useUiStore.getState().palettePanelSection).toBe("filters");
    expect(screen.getByText(copy.colorFiltersSectionLabel)).toBeInTheDocument();
  });
});
