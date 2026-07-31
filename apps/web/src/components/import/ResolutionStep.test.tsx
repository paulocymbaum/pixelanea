import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { ResolutionStep } from "./ResolutionStep";

describe("ResolutionStep", () => {
  it("renders resolution presets and remove-background toggle", () => {
    render(
      <ResolutionStep
        value={32}
        onChange={vi.fn()}
        removeBackground={true}
        onRemoveBackgroundChange={vi.fn()}
      />,
    );

    expect(screen.getByText(copy.importWizardResolutionHint)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.importWizardRemoveBackgroundOn }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles remove background", () => {
    const onRemoveBackgroundChange = vi.fn();
    render(
      <ResolutionStep
        value={32}
        onChange={vi.fn()}
        removeBackground={false}
        onRemoveBackgroundChange={onRemoveBackgroundChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: copy.importWizardRemoveBackgroundOff }),
    );
    expect(onRemoveBackgroundChange).toHaveBeenCalledWith(true);
  });
});
