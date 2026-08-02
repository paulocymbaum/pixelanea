import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import { useEditorShortcuts } from "./shortcuts";

function ShortcutHarness() {
  useEditorShortcuts();
  return null;
}

describe("useEditorShortcuts", () => {
  beforeEach(() => {
    useSessionStore.setState({ palettePanelSection: "swatches" });
    useUiStore.setState({ shortcutsOverlayOpen: false, paletteCollapsed: false });
  });

  it("Alt+1 through Alt+4 select palette panel sections", () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");

    fireEvent.keyDown(window, { key: "4", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("filters");

    fireEvent.keyDown(window, { key: "1", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });

  it("expands collapsed palette panel when Alt+digit selects a section", () => {
    useUiStore.setState({ paletteCollapsed: true });
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: "3", altKey: true });

    expect(useSessionStore.getState().palettePanelSection).toBe("shading");
    expect(useUiStore.getState().paletteCollapsed).toBe(false);
  });

  it("] and [ cycle palette panel sections", () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: "]" });
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");

    fireEvent.keyDown(window, { key: "]" });
    expect(useSessionStore.getState().palettePanelSection).toBe("shading");

    fireEvent.keyDown(window, { key: "[" });
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");

    fireEvent.keyDown(window, { key: "[" });
    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });

  it("expands collapsed palette panel when bracket keys cycle sections", () => {
    useUiStore.setState({ paletteCollapsed: true });
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: "]" });

    expect(useUiStore.getState().paletteCollapsed).toBe(false);
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");
  });

  it("does not change palette section when Alt+digit is pressed in an input", () => {
    render(
      <>
        <ShortcutHarness />
        <input aria-label="test input" />
      </>,
    );

    const input = document.querySelector("input")!;
    fireEvent.keyDown(input, { key: "3", altKey: true });

    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });
});
