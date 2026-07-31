import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";
import { SkippableOverlay } from "./SkippableOverlay";

describe("SkippableOverlay", () => {
  beforeEach(() => {
    useUiStore.setState({ onboardingDismissed: false, onboardingStep: 0 });
  });

  it("renders the first onboarding step", () => {
    render(<SkippableOverlay />);
    expect(screen.getByText(copy.onboardingStepPickColorTitle)).toBeInTheDocument();
  });

  it("advances steps and dismisses on done", () => {
    render(<SkippableOverlay />);
    fireEvent.click(screen.getByText(copy.onboardingNext));
    expect(screen.getByText(copy.onboardingStepPaintTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(copy.onboardingNext));
    fireEvent.click(screen.getByText(copy.onboardingDone));
    expect(useUiStore.getState().onboardingDismissed).toBe(true);
  });

  it("skips the tour", () => {
    render(<SkippableOverlay />);
    fireEvent.click(screen.getByText(copy.onboardingSkip));
    expect(useUiStore.getState().onboardingDismissed).toBe(true);
  });
});
