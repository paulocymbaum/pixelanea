import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
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
    useUiStore.setState({ paletteCollapsed: false });
    useSessionStore.setState({ palettePanelSection: "swatches" });
    useEditorStore.setState({ projectId: "p1" });
  });

  it("shows only the active section content when expanded", () => {
    renderPanel();

    expect(screen.getByRole("listbox", { name: "Palette colors" })).toBeInTheDocument();
    expect(screen.getByText(copy.paletteQuickPresetsLabel)).toBeInTheDocument();
    expect(screen.queryByText(copy.palettePresetsLabel)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionPresets }),
    );

    expect(screen.getByText(copy.palettePresetsLabel)).toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "Palette colors" }),
    ).not.toBeInTheDocument();
  });

  it("see-all on swatches tab switches to presets section", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: copy.paletteQuickPresetsSeeAll }));

    expect(useSessionStore.getState().palettePanelSection).toBe("presets");
    expect(screen.getByText(copy.palettePresetsLabel)).toBeInTheDocument();
  });

  it("shows section icons when collapsed and expands on icon click", () => {
    useUiStore.setState({ paletteCollapsed: true, paletteMoreToolsExpanded: true });
    useSessionStore.setState({ palettePanelSection: "swatches" });
    renderPanel();

    expect(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: copy.palettePanelSectionFilters }),
    );

    expect(useUiStore.getState().paletteCollapsed).toBe(false);
    expect(useSessionStore.getState().palettePanelSection).toBe("filters");
    expect(screen.getByText(copy.colorFiltersSectionLabel)).toBeInTheDocument();
  });

  it("shows placeholder without section rail when no project is loaded", () => {
    useEditorStore.setState({ projectId: null });
    renderPanel();

    expect(screen.getByText(copy.palettePlaceholder)).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Palette sections" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "Palette colors" }),
    ).not.toBeInTheDocument();
  });
});
