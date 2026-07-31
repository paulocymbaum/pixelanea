import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("drops falsy values", () => {
    const hidden: string | false = false;
    expect(cn("foo", hidden, undefined, "baz")).toBe("foo baz");
  });

  it("resolves conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
  });
});
