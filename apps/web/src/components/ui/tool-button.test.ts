import { describe, expect, it } from "vitest";
import { toolButtonVariants } from "./tool-button";

describe("toolButtonVariants", () => {
  it("applies accent border and muted bg when active", () => {
    const classes = toolButtonVariants({ active: true });
    expect(classes).toContain("border-accent");
    expect(classes).toContain("bg-accent-muted");
    expect(classes).toContain("font-semibold");
    expect(classes).toContain("focus-visible:outline-focus-ring");
  });

  it("uses transparent border when inactive", () => {
    const classes = toolButtonVariants({ active: false });
    expect(classes).toContain("border-transparent");
    expect(classes).not.toContain("border-accent");
  });

  it("always includes 3px left border slot", () => {
    const classes = toolButtonVariants();
    expect(classes).toContain("border-l-[3px]");
  });
});
