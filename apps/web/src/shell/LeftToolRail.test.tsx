import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { tools } from "@/content/tools";
import { useEditorStore } from "@/state/editorStore";
import { PAINT_TOOL_IDS } from "@/tools/registry";
import { LeftToolRail } from "./LeftToolRail";

describe("LeftToolRail", () => {
  beforeEach(() => {
    useEditorStore.setState({ activeTool: "paint" });
  });

  it("renders all paint tools and a duplicate-frames chrome action", () => {
    render(<LeftToolRail />);

    expect(screen.getByRole("complementary", { name: "Tools" })).toBeInTheDocument();

    for (const id of PAINT_TOOL_IDS) {
      expect(screen.getByRole("button", { name: tools[id] })).toBeInTheDocument();
    }

    expect(
      screen.getByRole("button", { name: copy.frameDuplicateTitle }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(PAINT_TOOL_IDS.length + 1);
  });

  it("marks active paint tool with pressed state and accent border classes", () => {
    render(<LeftToolRail />);

    const paintButton = screen.getByRole("button", { name: tools.paint });
    expect(paintButton).toHaveAttribute("aria-pressed", "true");
    expect(paintButton.className).toContain("border-accent");
  });

  it("switches active tool when a paint tool is clicked", () => {
    render(<LeftToolRail />);

    fireEvent.click(screen.getByRole("button", { name: tools.eraser }));

    expect(useEditorStore.getState().activeTool).toBe("eraser");
    expect(screen.getByRole("button", { name: tools.eraser })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders duplicate with icon and visible label", () => {
    render(<LeftToolRail />);

    const duplicateButton = screen.getByRole("button", {
      name: copy.frameDuplicateTitle,
    });
    expect(duplicateButton).toHaveTextContent(copy.frameDuplicateToolLabel);
    expect(duplicateButton.className).toContain("text-secondary/80");
  });

  it("opens duplicate dialog instead of changing active tool", () => {
    render(<LeftToolRail />);

    fireEvent.click(screen.getByRole("button", { name: copy.frameDuplicateTitle }));

    expect(useEditorStore.getState().activeTool).toBe("paint");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(copy.frameDuplicateDescription)).toBeInTheDocument();
  });
});
