/**
 * Project chrome status — pure derivation (no React).
 *
 * Priority order (why: trust / save state before API jargon):
 * 1. checking
 * 2. disconnected
 * 3. error (sync)
 * 4. saving
 * 5. unsaved (`isDirty` || `isPaletteDirty`)
 * 6. saved
 * 7. idle
 */
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";

export type ProjectStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "disconnected"; label: string }
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
};

export function deriveProjectStatus(input: ProjectStatusInput): ProjectStatus {
  const { hasProject, apiStatus, syncStatus, isDirty, isPaletteDirty } = input;

  if (apiStatus === "checking") {
    return { kind: "checking" };
  }

  if (apiStatus === "disconnected") {
    return { kind: "disconnected", label: errors.apiDisconnected };
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

  return { kind: "idle" };
}
