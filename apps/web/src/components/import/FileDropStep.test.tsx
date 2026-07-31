import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { FileDropStep } from "./FileDropStep";

describe("FileDropStep", () => {
  it("shows drop hint when no file is selected", () => {
    render(<FileDropStep file={null} error={null} onFileSelected={() => {}} />);
    expect(screen.getByText(copy.importWizardDropHint)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows image preview when a file is selected", () => {
    const file = new File(["pixels"], "sprite.png", { type: "image/png" });
    render(
      <FileDropStep file={file} error={null} onFileSelected={() => {}} />,
    );

    expect(screen.getByRole("img", { name: copy.importWizardDropPreviewLabel })).toBeInTheDocument();
    expect(screen.getByText("sprite.png")).toBeInTheDocument();
  });

  it("calls onFileSelected when a file is chosen", () => {
    const onFileSelected = vi.fn();
    render(
      <FileDropStep file={null} error={null} onFileSelected={onFileSelected} />,
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const file = new File(["pixels"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input!, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
