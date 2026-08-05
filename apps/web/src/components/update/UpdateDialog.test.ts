import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";

describe("update copy", () => {
  it("formats up-to-date message", () => {
    expect(copy.updateDialogUpToDate("1.2.0", "abc1234")).toContain("v1.2.0");
    expect(copy.updateDialogUpToDate("1.2.0", "abc1234")).toContain("abc1234");
  });

  it("formats update-available message", () => {
    const message = copy.updateDialogUpdateAvailable("1.0.0", "1.2.0", "def5678");
    expect(message).toContain("v1.0.0");
    expect(message).toContain("v1.2.0");
    expect(message).toContain("def5678");
  });
});
