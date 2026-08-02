import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      paletteCollapsed: false,
      palettePanelSection: "swatches",
      showTechnicalInfo: false,
      apiStatus: "checking",
      apiVersion: null,
      onboardingDismissed: false,
      onboardingStep: 0,
      importWizardStep: 0,
    });
  });

  it("setApiStatus updates status and version", () => {
    useUiStore.getState().setApiStatus("connected", "1.0.0");
    expect(useUiStore.getState().apiStatus).toBe("connected");
    expect(useUiStore.getState().apiVersion).toBe("1.0.0");
  });

  it("setPaletteCollapsed toggles palette panel", () => {
    useUiStore.getState().setPaletteCollapsed(true);
    expect(useUiStore.getState().paletteCollapsed).toBe(true);
  });

  it("defaults palettePanelSection to swatches", () => {
    expect(useUiStore.getState().palettePanelSection).toBe("swatches");
  });

  it("setPalettePanelSection updates active section", () => {
    useUiStore.getState().setPalettePanelSection("filters");
    expect(useUiStore.getState().palettePanelSection).toBe("filters");
  });
});
