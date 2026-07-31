import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("renders slider with accent range track", () => {
    render(
      <Slider
        defaultValue={[8]}
        min={1}
        max={24}
        step={1}
        aria-label="Animation FPS"
      />,
    );

    const slider = screen.getByRole("slider", { name: "Animation FPS" });
    expect(slider).toBeInTheDocument();
    expect(slider.getAttribute("aria-valuenow")).toBe("8");
  });
});
