import { describe, expect, it } from "vitest";
import {
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
    syncStatus: "idle",
    ...overrides,
  };
}

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
