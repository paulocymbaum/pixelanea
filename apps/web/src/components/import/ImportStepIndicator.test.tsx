import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { ImportStepIndicator } from "./ImportStepIndicator";

describe("ImportStepIndicator", () => {
  it("renders a tab for each wizard step", () => {
    render(
      <ImportStepIndicator currentStep="resolution" onStepSelect={() => {}} />,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(
      screen.getByRole("tab", { name: copy.importWizardStepResolution }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("marks completed steps with a check and completed label", () => {
    render(
      <ImportStepIndicator currentStep="palette" onStepSelect={() => {}} />,
    );

    expect(
      screen.getByRole("tab", {
        name: copy.importWizardStepCompleted(copy.importWizardStepFile),
      }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("tab", {
        name: copy.importWizardStepCompleted(copy.importWizardStepResolution),
      }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("tab", { name: copy.importWizardStepPalette }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("disables future steps", () => {
    render(
      <ImportStepIndicator currentStep="file" onStepSelect={() => {}} />,
    );

    expect(
      screen.getByRole("tab", { name: copy.importWizardStepResolution }),
    ).toBeDisabled();
    expect(
      screen.getByRole("tab", { name: copy.importWizardStepPreview }),
    ).toBeDisabled();
  });

  it("navigates to completed steps on click", () => {
    const onStepSelect = vi.fn();
    render(
      <ImportStepIndicator currentStep="preview" onStepSelect={onStepSelect} />,
    );

    fireEvent.click(
      screen.getByRole("tab", {
        name: copy.importWizardStepCompleted(copy.importWizardStepFile),
      }),
    );

    expect(onStepSelect).toHaveBeenCalledWith("file");
  });

  it("wires tabs to their panels", () => {
    render(
      <ImportStepIndicator currentStep="palette" onStepSelect={() => {}} />,
    );

    expect(
      screen.getByRole("tab", { name: copy.importWizardStepPalette }),
    ).toHaveAttribute("aria-controls", "import-wizard-panel-palette");
  });
});
