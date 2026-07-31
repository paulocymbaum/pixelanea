import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { BottomFrameStrip } from "./BottomFrameStrip";

describe("BottomFrameStrip", () => {
  beforeEach(() => {
    useEditorStore.setState({
      frameCount: 1,
      activeFrameIndex: 0,
      framePixelsByIndex: {},
      isPlaying: false,
      gridWidth: 4,
      gridHeight: 4,
      pixels: new Uint8Array(16),
      paletteColors: ["#000000", "#FFFFFF"],
    });
  });

  it("is hidden when frameCount is 1", () => {
    const { container } = render(<BottomFrameStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders thumbnails and animation controls when frameCount > 1", () => {
    useEditorStore.setState({ frameCount: 8 });
    render(<BottomFrameStrip />);
    expect(screen.getByLabelText(copy.frameStripLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.frameThumbnail(0))).toBeInTheDocument();
    expect(screen.getByLabelText(copy.frameThumbnail(7))).toBeInTheDocument();
    expect(screen.getByLabelText(copy.animationPlay)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: copy.animationFps })).toBeInTheDocument();
    expect(screen.getByText(copy.animationLoop)).toBeInTheDocument();
  });

  it("highlights the active frame thumbnail", () => {
    useEditorStore.setState({
      frameCount: 4,
      activeFrameIndex: 2,
    });
    render(<BottomFrameStrip />);
    expect(screen.getByLabelText(copy.frameThumbnail(2))).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("disables frame selection while playing", () => {
    useEditorStore.setState({ frameCount: 4, isPlaying: true });
    render(<BottomFrameStrip />);
    fireEvent.click(screen.getByLabelText(copy.frameThumbnail(1)));
    expect(useEditorStore.getState().activeFrameIndex).toBe(0);
  });

  it("exposes copy-from menu on thumbnails", () => {
    useEditorStore.setState({ frameCount: 4, projectId: "proj-1" });
    render(<BottomFrameStrip />);
    expect(screen.getAllByLabelText(copy.frameCopyFromMenu).length).toBe(4);
  });
});
