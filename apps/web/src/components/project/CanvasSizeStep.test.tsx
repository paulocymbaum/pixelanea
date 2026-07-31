import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { CanvasSizeStep } from "./CanvasSizeStep";

describe("CanvasSizeStep", () => {
  it("renders presets and custom option", () => {
    render(<CanvasSizeStep value={{ width: 32, height: 32 }} onChange={() => {}} />);
    expect(screen.getByText("Sprite")).toBeInTheDocument();
    expect(screen.getByText(copy.customCanvasSizeLabel)).toBeInTheDocument();
  });

  it("calls onChange when a preset is selected", () => {
    const onChange = vi.fn();
    render(<CanvasSizeStep value={{ width: 32, height: 32 }} onChange={onChange} />);
    fireEvent.click(screen.getByText("Icon"));
    expect(onChange).toHaveBeenCalledWith({ width: 16, height: 16 });
  });

  it("opens custom dialog and applies size", () => {
    const onChange = vi.fn();
    render(<CanvasSizeStep value={{ width: 32, height: 32 }} onChange={onChange} />);
    fireEvent.click(screen.getByText(copy.customCanvasSizeLabel));
    fireEvent.change(screen.getByLabelText(copy.customCanvasSizeWidthLabel), {
      target: { value: "48" },
    });
    fireEvent.change(screen.getByLabelText(copy.customCanvasSizeHeightLabel), {
      target: { value: "64" },
    });
    fireEvent.click(screen.getByText(copy.customCanvasSizeConfirm));
    expect(onChange).toHaveBeenCalledWith({ width: 48, height: 64 });
  });
});
