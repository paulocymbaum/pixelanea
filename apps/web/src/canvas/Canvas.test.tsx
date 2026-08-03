import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useViewportStore } from "@/state/viewportStore";
import { stubCanvasEnvironment } from "@/test/canvas-mocks";
import { Canvas } from "./Canvas";

describe("Canvas", () => {
  beforeEach(() => {
    useEditorStore.setState({
      gridWidth: 32,
      gridHeight: 32,
      hoverCell: null,
    });
    useViewportStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
    });

    stubCanvasEnvironment();
  });

  it("renders a canvas element", () => {
    render(<Canvas />);
    expect(screen.getByLabelText("Pixel canvas")).toBeInTheDocument();
  });

  it("renders zoom controls", () => {
    render(<Canvas />);
    expect(screen.getByRole("toolbar", { name: "Canvas zoom" })).toBeInTheDocument();
  });

  it("shows an empty-canvas hint until the first painted pixel", async () => {
    render(<Canvas />);
    expect(screen.getByText(copy.emptyCanvasHint)).toBeInTheDocument();

    await act(async () => {
      const next = new Uint8Array(32 * 32);
      next[0] = 1;
      useEditorStore.setState({
        pixels: next,
        framePixelsByIndex: { 0: new Uint8Array(next) },
      });
    });

    expect(screen.queryByText(copy.emptyCanvasHint)).not.toBeInTheDocument();
  });

  it("uses the hand tool cursor when hand is active", () => {
    useEditorStore.setState({ activeTool: "hand" });

    render(<Canvas />);
    const canvas = screen.getByLabelText("Pixel canvas");

    expect(canvas).toHaveStyle({ cursor: "grab" });
  });
});
