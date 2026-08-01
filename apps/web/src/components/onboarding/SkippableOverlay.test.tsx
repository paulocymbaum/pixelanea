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

  it("positions the paint step above the bottom strip", () => {
    useUiStore.setState({ onboardingStep: 1 });
    const { container } = render(<SkippableOverlay />);
    const card = container.querySelector('[role="dialog"]');
    expect(card?.className).toContain("bottom-24");
    expect(card?.className).toContain("-translate-x-1/2");
    expect(card?.className).not.toContain("top-1/2");
  });

  it("advances through all steps and dismisses on done", () => {
    render(<SkippableOverlay />);
    fireEvent.click(screen.getByText(copy.onboardingNext));
    expect(screen.getByText(copy.onboardingStepPaintTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(copy.onboardingNext));
    expect(screen.getByText(copy.onboardingStepSaveTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(copy.onboardingNext));
    expect(screen.getByText(copy.onboardingStepAnimateTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(copy.onboardingDone));
    expect(useUiStore.getState().onboardingDismissed).toBe(true);
  });

  it("skips the tour", () => {
    render(<SkippableOverlay />);
    fireEvent.click(screen.getByText(copy.onboardingSkip));
    expect(useUiStore.getState().onboardingDismissed).toBe(true);
  });
});
