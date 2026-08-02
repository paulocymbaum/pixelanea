/**
 * Project chrome status — pure derivation (no React).
 *
 * Priority order (why: trust / save state before API jargon):
 * 1. checking
 * 2. error (sync)
 * 3. saving
 * 4. unsaved (`isDirty` || `isPaletteDirty`) — bundle file staleness uses header dot only
 * 5. saved
 * 6. idle
 *
 * Disconnect UX is owned by ConnectionBanner — not repeated here.
 */
import { useMemo } from "react";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
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
    return { kind: "saving", label: copy.statusSaving };
  }

  if (isDirty || isPaletteDirty) {
    return { kind: "unsaved", label: copy.statusUnsaved };
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
  const syncStatus = useEditorStore((s) => s.syncStatus);
  const apiStatus = useUiStore((s) => s.apiStatus);

  return useMemo(
    () =>
      deriveProjectStatus({
        hasProject,
        apiStatus,
        syncStatus,
        isDirty,
        isPaletteDirty,
        bundleDirty,
      }),
    [
      hasProject,
      apiStatus,
      syncStatus,
      isDirty,
      isPaletteDirty,
      bundleDirty,
    ],
  );
}
