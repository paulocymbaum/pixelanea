import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders primary variant with accent background", () => {
    render(<Button variant="primary">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toContain("bg-accent");
    expect(button.className).toContain("min-h-10");
  });

  it("renders secondary variant with border", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.className).toContain("border-border");
    expect(button.className).toContain("bg-elevated");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">More</Button>);
    const button = screen.getByRole("button", { name: "More" });
    expect(button.className).toContain("hover:bg-accent-muted");
  });

  it("renders destructive variant with danger token", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-danger");
  });

  it("renders icon size", () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Close">
        ×
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button.className).toContain("h-10");
    expect(button.className).toContain("w-10");
  });
});
