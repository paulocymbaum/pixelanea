import { createElement } from "react";
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
    useUiStore.setState({ shortcutsOverlayOpen: false });
  });

  it("Alt+1 through Alt+4 select palette panel sections", () => {
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");

    fireEvent.keyDown(window, { key: "4", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("filters");

    fireEvent.keyDown(window, { key: "1", altKey: true });
    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });

  it("does not change palette section when Alt+digit is pressed in an input", () => {
    render(
      createElement(
        "div",
        null,
        createElement(ShortcutHarness),
        createElement("input", { "aria-label": "test input" }),
      ),
    );

    const input = document.querySelector("input")!;
    fireEvent.keyDown(input, { key: "3", altKey: true });

    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });
});
