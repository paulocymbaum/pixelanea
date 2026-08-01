import { useMemo } from "react";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import {
  deriveProjectStatus,
  type ProjectStatus,
} from "@/lib/projectStatus";

/** Thin store wrapper — memoizes O(1) derive for shell chrome. */
export function useProjectStatus(): ProjectStatus {
  const hasProject = useEditorStore((s) => s.projectId != null);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isPaletteDirty = useEditorStore((s) => s.isPaletteDirty);
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
      }),
    [hasProject, apiStatus, syncStatus, isDirty, isPaletteDirty],
  );
}
