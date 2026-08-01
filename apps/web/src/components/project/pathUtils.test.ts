import { describe, expect, it } from "vitest";
import {
  basename,
  deriveDefaultName,
  hasNonPixelaneaExtension,
  isValidProjectPath,
  normalizeProjectPath,
} from "./pathUtils";

describe("pathUtils", () => {
  describe("basename", () => {
    it("returns the final path segment", () => {
      expect(basename("/home/teacher/usb/my-art.pixelanea")).toBe(
        "my-art.pixelanea",
      );
      expect(basename("C:\\Projects\\walk.pixelanea")).toBe("walk.pixelanea");
    });

    it("strips trailing slashes", () => {
      expect(basename("/tmp/projects/")).toBe("projects");
      expect(basename("/")).toBe("");
    });
  });

  describe("deriveDefaultName", () => {
    it("returns undefined for empty input", () => {
      expect(deriveDefaultName(null)).toBeUndefined();
      expect(deriveDefaultName(undefined)).toBeUndefined();
      expect(deriveDefaultName("")).toBeUndefined();
    });

    it("strips directory and .pixelanea extension", () => {
      expect(deriveDefaultName("/tmp/walk.pixelanea")).toBe("walk");
      expect(deriveDefaultName("C:\\Projects\\Hero.PIXELANEA")).toBe("Hero");
    });
  });

  describe("normalizeProjectPath", () => {
    it("returns empty string for blank input", () => {
      expect(normalizeProjectPath("   ")).toBe("");
    });

    it("appends .pixelanea when missing", () => {
      expect(normalizeProjectPath("/tmp/walk")).toBe("/tmp/walk.pixelanea");
    });

    it("preserves an existing .pixelanea extension", () => {
      expect(normalizeProjectPath("/tmp/walk.pixelanea")).toBe(
        "/tmp/walk.pixelanea",
      );
      expect(normalizeProjectPath("/tmp/WALK.PIXELANEA")).toBe(
        "/tmp/WALK.PIXELANEA",
      );
    });
  });

  describe("hasNonPixelaneaExtension", () => {
    it("returns false for extensionless or .pixelanea paths", () => {
      expect(hasNonPixelaneaExtension("/tmp/walk")).toBe(false);
      expect(hasNonPixelaneaExtension("/tmp/walk.pixelanea")).toBe(false);
    });

    it("returns true for other extensions", () => {
      expect(hasNonPixelaneaExtension("/tmp/art.png")).toBe(true);
      expect(hasNonPixelaneaExtension("C:\\art.zip")).toBe(true);
    });
  });

  describe("isValidProjectPath", () => {
    it("requires a non-empty .pixelanea path", () => {
      expect(isValidProjectPath("   ")).toBe(false);
      expect(isValidProjectPath("/tmp/art.png")).toBe(false);
      expect(isValidProjectPath("/tmp/walk.pixelanea")).toBe(true);
      expect(isValidProjectPath("  /tmp/walk.PIXELANEA  ")).toBe(true);
    });
  });
});
