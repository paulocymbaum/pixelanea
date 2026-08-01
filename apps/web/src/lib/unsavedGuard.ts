export type UnsavedGuardState = {
  isDirty: boolean;
  isPaletteDirty: boolean;
  syncStatus: "idle" | "syncing" | "error";
};

/** True when leaving the editor should prompt to discard unsaved sync work. */
export function needsNavigationGuard(state: UnsavedGuardState): boolean {
  if (state.syncStatus === "syncing") {
    return false;
  }
  return state.isDirty || state.isPaletteDirty;
}

/** True when navigation actions must be disabled until sync finishes. */
export function isNavigationBlocked(state: UnsavedGuardState): boolean {
  return state.syncStatus === "syncing";
}
