import { useEditorStore } from "@/state/editorStore";

export type UnsavedGuardState = {
  isDirty: boolean;
  isPaletteDirty: boolean;
  bundleDirty: boolean;
  syncStatus: "idle" | "syncing" | "error";
};

/** Snapshot of editor fields used by navigation guard helpers. */
export function getEditorNavigationGuardState(): UnsavedGuardState {
  const state = useEditorStore.getState();
  return {
    isDirty: state.isDirty,
    isPaletteDirty: state.isPaletteDirty,
    bundleDirty: state.bundleDirty,
    syncStatus: state.syncStatus,
  };
}

/** True when leaving the editor should prompt to discard unsaved sync work. */
export function needsNavigationGuard(state: UnsavedGuardState): boolean {
  if (state.syncStatus === "syncing") {
    return false;
  }
  return state.isDirty || state.isPaletteDirty || state.bundleDirty;
}

/** True when navigation actions must be disabled until sync finishes. */
export function isNavigationBlocked(state: UnsavedGuardState): boolean {
  return state.syncStatus === "syncing";
}
