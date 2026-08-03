import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useSessionStore } from "@/state/sessionStore";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { useViewportStore } from "@/state/viewportStore";
import {
  cyclePalettePanelSection,
  useEditorShortcuts,
} from "./shortcuts";

function ShortcutHarness() {
  useEditorShortcuts();
  return null;
}

describe("cyclePalettePanelSection", () => {
  it("cycles forward and backward through palette sections", () => {
    expect(cyclePalettePanelSection("swatches", "next")).toBe("presets");
    expect(cyclePalettePanelSection("presets", "next")).toBe("shading");
    expect(cyclePalettePanelSection("filters", "next")).toBe("swatches");
    expect(cyclePalettePanelSection("swatches", "prev")).toBe("filters");
    expect(cyclePalettePanelSection("presets", "prev")).toBe("swatches");
  });
});

describe("useEditorShortcuts", () => {
  beforeEach(() => {
    useSessionStore.setState({ palettePanelSection: "swatches" });
    useUiStore.setState({ shortcutsOverlayOpen: false, toastMessage: null, paletteMoreToolsExpanded: false });
    useEditorStore.setState({
      gridWidth: 4,
      gridHeight: 4,
      pixels: new Uint8Array(16),
      readOnly: false,
      selection: null,
      clipboard: null,
      pastePreview: null,
      undoStack: [],
      redoStack: [],
    });
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

  it("] and [ cycle palette panel sections", () => {
    render(createElement(ShortcutHarness));

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
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "]" });

    expect(useUiStore.getState().paletteCollapsed).toBe(false);
    expect(useSessionStore.getState().palettePanelSection).toBe("presets");
  });

  it("M activates the select tool", () => {
    useEditorStore.setState({ activeTool: "paint" });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "m" });

    expect(useEditorStore.getState().activeTool).toBe("select");
  });

  it("Ctrl+C copies the current selection when not readOnly", () => {
    const pixels = new Uint8Array(16);
    pixels[0] = 7;
    useEditorStore.setState({
      pixels,
      selection: { x: 0, y: 0, width: 1, height: 1, shape: "rect" },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toEqual({
      width: 1,
      height: 1,
      pixels: new Uint8Array([7]),
    });
    expect(useUiStore.getState().toastMessage).toBe(copy.selectionCopied);
  });

  it("Ctrl+C does nothing without a selection", () => {
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toBeNull();
    expect(useUiStore.getState().toastMessage).toBeNull();
  });

  it("Ctrl+C is ignored in editable targets", () => {
    useEditorStore.setState({
      selection: { x: 0, y: 0, width: 1, height: 1, shape: "rect" },
    });
    render(
      createElement(
        "div",
        null,
        createElement(ShortcutHarness),
        createElement("input", { "aria-label": "test input" }),
      ),
    );

    const input = document.querySelector("input")!;
    fireEvent.keyDown(input, { key: "c", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toBeNull();
    expect(useUiStore.getState().toastMessage).toBeNull();
  });

  it("Ctrl+C does not copy when readOnly", () => {
    useEditorStore.setState({
      readOnly: true,
      selection: { x: 0, y: 0, width: 1, height: 1, shape: "rect" },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toBeNull();
    expect(useUiStore.getState().toastMessage).toBeNull();
  });

  it("Ctrl+X cuts the current selection when not readOnly", () => {
    const pixels = new Uint8Array(16);
    pixels[0] = 7;
    useEditorStore.setState({
      pixels,
      selection: { x: 0, y: 0, width: 1, height: 1, shape: "rect" },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toEqual({
      width: 1,
      height: 1,
      pixels: new Uint8Array([7]),
    });
    expect(useEditorStore.getState().pixels[0]).toBe(0);
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
    expect(useUiStore.getState().toastMessage).toBe(copy.selectionCut);
  });

  it("Ctrl+X does nothing without a selection", () => {
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });

    expect(useEditorStore.getState().clipboard).toBeNull();
    expect(useUiStore.getState().toastMessage).toBeNull();
  });

  it("Ctrl+V starts paste preview from clipboard at hover cell", () => {
    const clipboard = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([2]),
    };
    useEditorStore.setState({
      clipboard,
      hoverCell: { x: 3, y: 1 },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    expect(useEditorStore.getState().pastePreview).toEqual({
      originX: 3,
      originY: 1,
      clipboard,
    });
  });

  it("Ctrl+V does nothing without clipboard or when readOnly", () => {
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(useEditorStore.getState().pastePreview).toBeNull();

    useEditorStore.setState({
      readOnly: true,
      clipboard: { width: 1, height: 1, pixels: new Uint8Array([1]) },
    });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(useEditorStore.getState().pastePreview).toBeNull();
  });

  it("Enter commits paste preview and Escape cancels without undo", () => {
    const clipboard = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([5]),
    };
    useEditorStore.setState({
      clipboard,
      pastePreview: { originX: 1, originY: 1, clipboard },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(useEditorStore.getState().pastePreview).toBeNull();
    expect(useEditorStore.getState().undoStack).toHaveLength(0);

    useEditorStore.setState({
      pastePreview: { originX: 1, originY: 1, clipboard },
      undoStack: [],
    });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(useEditorStore.getState().pastePreview).toBeNull();
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
    expect(useEditorStore.getState().pixels[1 * 4 + 1]).toBe(5);
  });

  it("arrow keys nudge paste preview by one cell", () => {
    const clipboard = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([5]),
    };
    useEditorStore.setState({
      pastePreview: { originX: 2, originY: 2, clipboard },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(useEditorStore.getState().pastePreview?.originX).toBe(3);
    expect(useEditorStore.getState().pastePreview?.originY).toBe(2);

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(useEditorStore.getState().pastePreview?.originX).toBe(3);
    expect(useEditorStore.getState().pastePreview?.originY).toBe(3);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(useEditorStore.getState().pastePreview?.originX).toBe(2);

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(useEditorStore.getState().pastePreview?.originY).toBe(2);
  });

  it("+ and - zoom the viewport; 0 fits canvas to view", () => {
    useViewportStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      containerSize: { width: 400, height: 300 },
    });
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "=" });
    expect(useViewportStore.getState().zoom).toBeGreaterThan(1);

    fireEvent.keyDown(window, { key: "-" });
    expect(useViewportStore.getState().zoom).toBeLessThanOrEqual(1);

    useViewportStore.setState({ zoom: 2, viewportUserAdjusted: true });
    fireEvent.keyDown(window, { key: "0" });
    expect(useViewportStore.getState().viewportUserAdjusted).toBe(false);
  });

  it("Alt+3 expands more tools and selects shading", () => {
    render(createElement(ShortcutHarness));

    fireEvent.keyDown(window, { key: "3", altKey: true });

    expect(useUiStore.getState().paletteMoreToolsExpanded).toBe(true);
    expect(useSessionStore.getState().palettePanelSection).toBe("shading");
  });
});
