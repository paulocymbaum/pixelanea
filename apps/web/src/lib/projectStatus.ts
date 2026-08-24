/**
 * Project chrome status — pure derivation (no React).
 *
 * Priority order (why: trust / save state before API jargon):
 * 1. checking
 * 2. error (sync)
 * 3. saving (active server sync)
 * 4. sync pending (debounced autosave not yet sent)
 * 5. unsaved (`isDirty` || `isPaletteDirty`)
 * 6. not saved to file (`bundleDirty` while pixels/palette are synced)
 * 7. saved
 * 8. idle
 *
 * Disconnect UX is owned by ConnectionBanner — not repeated here.
 */
import { useMemo } from "react";
import { copy } from "@/content/copy";
import { useEditorStore, useSyncPending, useSyncStatus } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";

export type ProjectStatus =
  | { kind: "idle"; label?: string }
  | { kind: "checking" }
  | { kind: "saving"; label: string }
  | { kind: "unsaved"; label: string }
  | { kind: "saved"; label: string }
  | { kind: "error"; label: string };

export type ProjectStatusInput = {
  hasProject: boolean;
  apiStatus: "checking" | "connected" | "disconnected";
  syncStatus: "idle" | "syncing" | "error";
  syncPending: boolean;
  isDirty: boolean;
  isPaletteDirty: boolean;
  bundleDirty: boolean;
};

export function deriveProjectStatus(input: ProjectStatusInput): ProjectStatus {
  const {
    hasProject,
    apiStatus,
    syncStatus,
    isDirty,
    isPaletteDirty,
    bundleDirty,
    syncPending,
  } = input;

  if (apiStatus === "checking") {
    return { kind: "checking" };
  }

  if (syncStatus === "error") {
    return {
      kind: "error",
      // Prefer plain chrome copy over raw sync payloads (UX mistake #8).
      label: copy.statusSyncError,
    };
  }

  if (syncStatus === "syncing") {
    return { kind: "saving", label: copy.statusSyncingToServer };
  }

  if (syncPending && (isDirty || isPaletteDirty)) {
    return { kind: "saving", label: copy.statusSyncPending };
  }

  if (isDirty || isPaletteDirty) {
    return { kind: "unsaved", label: copy.statusUnsaved };
  }

  if (bundleDirty && hasProject) {
    return { kind: "unsaved", label: copy.statusNotSavedToDisk };
  }

  if (hasProject) {
    return { kind: "saved", label: copy.statusSaved };
  }

  if (apiStatus === "connected") {
    return { kind: "idle", label: copy.statusReady };
  }

  return { kind: "idle" };
}

/** Single subscription point for shell chrome status (AppHeader, StatusBar). */
export function useDerivedProjectStatus(): ProjectStatus {
  const hasProject = useEditorStore((s) => s.projectId != null);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isPaletteDirty = useEditorStore((s) => s.isPaletteDirty);
  const bundleDirty = useEditorStore((s) => s.bundleDirty);
  const syncStatus = useSyncStatus();
  const syncPending = useSyncPending();
  const apiStatus = useUiStore((s) => s.apiStatus);

  return useMemo(
    () =>
      deriveProjectStatus({
        hasProject,
        apiStatus,
        syncStatus,
        syncPending,
        isDirty,
        isPaletteDirty,
        bundleDirty,
      }),
    [
      hasProject,
      apiStatus,
      syncStatus,
      syncPending,
      isDirty,
      isPaletteDirty,
      bundleDirty,
    ],
  );
}
