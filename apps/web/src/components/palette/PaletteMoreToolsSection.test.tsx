import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { PaletteMoreToolsSection } from "./PaletteMoreToolsSection";

describe("PaletteMoreToolsSection", () => {
  it("keeps power tools collapsed by default", () => {
    render(<PaletteMoreToolsSection />);

    expect(screen.getByText(copy.paletteMoreToolsSummary)).toBeInTheDocument();
    expect(
      screen.getByText(copy.paletteShadingSectionLabel),
    ).not.toBeVisible();
    expect(
      screen.getByText(copy.colorFiltersSectionLabel),
    ).not.toBeVisible();
  });

  it("reveals shading and filters when expanded", () => {
    render(<PaletteMoreToolsSection />);

    fireEvent.click(screen.getByText(copy.paletteMoreToolsSummary));

    expect(screen.getByText(copy.paletteShadingSectionLabel)).toBeVisible();
    expect(screen.getByText(copy.colorFiltersSectionLabel)).toBeVisible();
  });

  it("uses native details summary for disclosure", () => {
    render(<PaletteMoreToolsSection />);

    const summary = screen.getByText(copy.paletteMoreToolsSummary);
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });
});
