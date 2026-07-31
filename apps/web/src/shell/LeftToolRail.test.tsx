import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { tools } from "@/content/tools";
import { useEditorStore } from "@/state/editorStore";
import { LeftToolRail } from "./LeftToolRail";

describe("LeftToolRail", () => {
  beforeEach(() => {
    useEditorStore.setState({ activeTool: "paint" });
  });

  it("renders tools with icon labels from content", () => {
    render(<LeftToolRail />);

    expect(screen.getByRole("complementary", { name: "Tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: tools.paint })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: tools.eraser })).toBeInTheDocument();
  });

  it("marks active tool with pressed state and accent border classes", () => {
    render(<LeftToolRail />);

    const paintButton = screen.getByRole("button", { name: tools.paint });
    expect(paintButton).toHaveAttribute("aria-pressed", "true");
    expect(paintButton.className).toContain("border-accent");
  });

  it("switches active tool on click", () => {
    render(<LeftToolRail />);

    fireEvent.click(screen.getByRole("button", { name: tools.eraser }));

    expect(useEditorStore.getState().activeTool).toBe("eraser");
    expect(screen.getByRole("button", { name: tools.eraser })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
