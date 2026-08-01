import { describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import {
  getEditorNavigationGuardState,
  isNavigationBlocked,
  needsNavigationGuard,
  type UnsavedGuardState,
} from "./unsavedGuard";

function guardState(
  overrides: Partial<UnsavedGuardState> = {},
): UnsavedGuardState {
  return {
    isDirty: false,
    isPaletteDirty: false,
    bundleDirty: false,
    syncStatus: "idle",
    ...overrides,
  };
}

describe("getEditorNavigationGuardState", () => {
  it("reads current editor store fields", () => {
    useEditorStore.setState({
      isDirty: true,
      isPaletteDirty: false,
      bundleDirty: true,
      syncStatus: "error",
    });

    expect(getEditorNavigationGuardState()).toEqual({
      isDirty: true,
      isPaletteDirty: false,
      bundleDirty: true,
      syncStatus: "error",
    });
  });
});

describe("needsNavigationGuard", () => {
  it("returns false when frame and palette are clean", () => {
    expect(needsNavigationGuard(guardState())).toBe(false);
  });

  it("returns true when frame sync is dirty", () => {
    expect(needsNavigationGuard(guardState({ isDirty: true }))).toBe(true);
  });

  it("returns true when palette sync is dirty", () => {
    expect(
      needsNavigationGuard(guardState({ isPaletteDirty: true })),
    ).toBe(true);
  });

  it("returns true when bundle is dirty", () => {
    expect(needsNavigationGuard(guardState({ bundleDirty: true }))).toBe(true);
  });

  it("returns false while sync is in flight", () => {
    expect(
      needsNavigationGuard(
        guardState({ isDirty: true, syncStatus: "syncing" }),
      ),
    ).toBe(false);
  });
});

describe("isNavigationBlocked", () => {
  it("returns false when idle", () => {
    expect(isNavigationBlocked(guardState())).toBe(false);
  });

  it("returns true while syncing", () => {
    expect(isNavigationBlocked(guardState({ syncStatus: "syncing" }))).toBe(
      true,
    );
  });
});
