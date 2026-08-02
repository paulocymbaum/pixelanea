import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveTheme, useSessionStore } from "./sessionStore";

describe("resolveTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns light and dark directly", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("follows system dark preference", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    expect(resolveTheme("system")).toBe("dark");
  });

  it("follows system light preference", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("sessionStore palette panel section", () => {
  beforeEach(() => {
    useSessionStore.setState({ palettePanelSection: "swatches" });
  });

  it("defaults palettePanelSection to swatches", () => {
    expect(useSessionStore.getState().palettePanelSection).toBe("swatches");
  });

  it("setPalettePanelSection updates active section", () => {
    useSessionStore.getState().setPalettePanelSection("filters");
    expect(useSessionStore.getState().palettePanelSection).toBe("filters");
  });

  it("persists palettePanelSection in localStorage", () => {
    useSessionStore.getState().setPalettePanelSection("shading");
    const stored = localStorage.getItem("pixelanea-session");
    expect(stored).toContain('"palettePanelSection":"shading"');
  });
});
