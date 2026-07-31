import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      paletteCollapsed: false,
      showTechnicalInfo: false,
      apiStatus: "checking",
      apiVersion: null,
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
});
