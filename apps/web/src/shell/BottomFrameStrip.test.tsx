import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { BottomFrameStrip } from "./BottomFrameStrip";

describe("BottomFrameStrip", () => {
  beforeEach(() => {
    useEditorStore.setState({ frameCount: 1 });
  });

  it("is hidden when frameCount is 1", () => {
    const { container } = render(<BottomFrameStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders thumbnails when frameCount > 1", () => {
    useEditorStore.setState({ frameCount: 8 });
    render(<BottomFrameStrip />);
    expect(screen.getByLabelText("Frame strip")).toBeInTheDocument();
    expect(screen.getByText(copy.frameStripPlaceholder)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
