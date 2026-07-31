import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import { stubCanvasEnvironment } from "@/test/canvas-mocks";
import { Canvas } from "./Canvas";

describe("Canvas", () => {
  beforeEach(() => {
    useEditorStore.setState({
      gridWidth: 32,
      gridHeight: 32,
      zoom: 1,
      panX: 0,
      panY: 0,
      hoverCell: null,
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
});
