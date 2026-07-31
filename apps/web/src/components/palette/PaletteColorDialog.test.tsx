import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaletteColorDialog } from "./PaletteColorDialog";

describe("PaletteColorDialog", () => {
  it("does not call onSave when color changes, only when Save is clicked", () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <PaletteColorDialog
        open
        onOpenChange={onOpenChange}
        mode="add"
        initialColor="#808080"
        onSave={onSave}
      />,
    );

    const colorInput = screen.getByLabelText("Color picker");
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });

    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save color" }));

    expect(onSave).toHaveBeenCalledWith("#ff0000");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without saving when Cancel is clicked", () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <PaletteColorDialog
        open
        onOpenChange={onOpenChange}
        mode="edit"
        initialColor="#123456"
        onSave={onSave}
      />,
    );

    const colorInput = screen.getByLabelText("Color picker");
    fireEvent.change(colorInput, { target: { value: "#abcdef" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("updates draft color when a generated shade is selected", () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <PaletteColorDialog
        open
        onOpenChange={onOpenChange}
        mode="edit"
        initialColor="#808080"
        onSave={onSave}
      />,
    );

    const shade = screen.getAllByRole("option")[0];
    fireEvent.click(shade);
    const selectedHex = shade.getAttribute("title");

    fireEvent.click(screen.getByRole("button", { name: "Save color" }));

    expect(onSave).toHaveBeenCalledWith(selectedHex);
  });
});
