import { useCallback, useRef, useState } from "react";
import type { AssetType } from "@pixelanea/api-client";
import {
  openProjectFromBundle,
  saveProjectToBundle,
} from "@/api/projects";
import { errors } from "@/content/errors";
import { copy } from "@/content/copy";
import { loadProjectIntoEditor } from "@/hooks/useLoadProject";
import {
  isNavigationBlocked,
  needsNavigationGuard,
} from "@/lib/unsavedGuard";
import { useEditorStore } from "@/state/editorStore";
import { flushAllSync } from "@/state/persist";
import { useUiStore } from "@/state/uiStore";
import { OverwriteConfirmDialog } from "./OverwriteConfirmDialog";
import { ProjectPathDialog } from "./ProjectPathDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

type UseProjectFileActionsOptions = {
  onNewProject: () => void;
  onProjectOpened?: () => void;
};

export function useProjectFileActions({
  onNewProject,
  onProjectOpened,
}: UseProjectFileActionsOptions) {
  const projectId = useEditorStore((s) => s.projectId);
  const bundlePath = useEditorStore((s) => s.bundlePath);
  const assetType = useEditorStore((s) => s.assetType);
  const frameCount = useEditorStore((s) => s.frameCount);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isPaletteDirty = useEditorStore((s) => s.isPaletteDirty);
  const syncStatus = useEditorStore((s) => s.syncStatus);
  const setBundlePath = useEditorStore((s) => s.setBundlePath);
  const setAssetType = useEditorStore((s) => s.setAssetType);
  const showToast = useUiStore((s) => s.showToast);

  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  /** Runs once the save started from the unsaved-work prompt succeeds. */
  const afterSaveRef = useRef<(() => void) | null>(null);
  /** Navigation to run after the user discards unsaved work. */
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const [pendingSavePath, setPendingSavePath] = useState<string | null>(null);
  const [pendingSaveAssetType, setPendingSaveAssetType] = useState<AssetType | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const guardState = {
    isDirty,
    isPaletteDirty,
    syncStatus,
  };
  const navigationBlocked = isNavigationBlocked(guardState);

  const performSave = useCallback(
    async (path: string, nextAssetType?: AssetType) => {
      if (!projectId) {
        return;
      }

      setIsSubmitting(true);
      setDialogError(null);

      await flushAllSync();

      const resolvedAssetType = nextAssetType ?? assetType;
      const result = await saveProjectToBundle(projectId, path, resolvedAssetType);
      setIsSubmitting(false);

      if (!result.ok) {
        setDialogError(result.message || errors.saveProjectFailed);
        if (!saveAsDialogOpen && !overwriteOpen) {
          useEditorStore.getState().setFrameSyncStatus("error", result.message);
        }
        return;
      }

      setBundlePath(result.path);
      setAssetType(resolvedAssetType);
      setSaveAsDialogOpen(false);
      setOverwriteOpen(false);
      setPendingSavePath(null);
      setPendingSaveAssetType(null);
      showToast(copy.projectSavedToast);

      const afterSave = afterSaveRef.current;
      afterSaveRef.current = null;
      afterSave?.();
    },
    [
      assetType,
      overwriteOpen,
      projectId,
      saveAsDialogOpen,
      setAssetType,
      setBundlePath,
      showToast,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!projectId) {
      return;
    }

    if (!bundlePath) {
      setSaveAsDialogOpen(true);
      return;
    }

    await performSave(bundlePath, assetType);
  }, [assetType, bundlePath, performSave, projectId]);

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
  }, []);

  const requestGuardedNavigation = useCallback(
    (action: () => void) => {
      const state = { isDirty, isPaletteDirty, syncStatus };
      if (isNavigationBlocked(state)) {
        return;
      }

      if (needsNavigationGuard(state)) {
        pendingNavigationRef.current = action;
        setUnsavedOpen(true);
        return;
      }

      action();
    },
    [isDirty, isPaletteDirty, syncStatus],
  );

  const handleNewProjectRequest = useCallback(() => {
    requestGuardedNavigation(onNewProject);
  }, [onNewProject, requestGuardedNavigation]);

  const handleSaveBeforeNavigation = useCallback(() => {
    setUnsavedOpen(false);
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    afterSaveRef.current = pending ?? onNewProject;
    void handleSave();
  }, [handleSave, onNewProject]);

  const handleDiscardNavigation = useCallback(() => {
    setUnsavedOpen(false);
    const action = pendingNavigationRef.current ?? onNewProject;
    pendingNavigationRef.current = null;
    action();
  }, [onNewProject]);

  const handleSaveAsRequest = useCallback(
    ({ path, assetType: nextAssetType }: { path: string; assetType?: AssetType }) => {
      setPendingSavePath(path);
      setPendingSaveAssetType(nextAssetType ?? assetType);
      setOverwriteOpen(true);
    },
    [assetType],
  );

  const handleOpenRequest = useCallback(
    async ({ path }: { path: string }) => {
      setIsSubmitting(true);
      setDialogError(null);

      // Loading a project resets the sync queue, so land any pending edits of
      // the current project before the switch instead of dropping them.
      await flushAllSync();

      const opened = await openProjectFromBundle(path);
      if (!opened.ok) {
        setIsSubmitting(false);
        setDialogError(opened.message || errors.openProjectFailed);
        return;
      }

      const loaded = await loadProjectIntoEditor(opened.project.id, {
        bundlePath: path,
      });
      setIsSubmitting(false);

      if (!loaded.ok) {
        setDialogError(loaded.message);
        return;
      }

      setOpenDialogOpen(false);
      onProjectOpened?.();
    },
    [onProjectOpened],
  );

  const handleOpenProjectRequest = useCallback(() => {
    requestGuardedNavigation(() => {
      setDialogError(null);
      setOpenDialogOpen(true);
    });
  }, [requestGuardedNavigation]);

  const dialogs = (
    <>
      <ProjectPathDialog
        open={openDialogOpen}
        onOpenChange={(open) => {
          setOpenDialogOpen(open);
          if (!open) setDialogError(null);
        }}
        mode="open"
        onSubmit={handleOpenRequest}
        isSubmitting={isSubmitting}
        error={openDialogOpen ? dialogError : null}
      />
      <ProjectPathDialog
        open={saveAsDialogOpen}
        onOpenChange={(open) => {
          setSaveAsDialogOpen(open);
          if (!open) {
            setDialogError(null);
            afterSaveRef.current = null;
          }
        }}
        mode="saveAs"
        initialPath={bundlePath ?? ""}
        initialAssetType={assetType}
        animationAssetTypeEnabled={frameCount > 1}
        onSubmit={handleSaveAsRequest}
        isSubmitting={isSubmitting}
        error={saveAsDialogOpen ? dialogError : null}
      />
      <OverwriteConfirmDialog
        open={overwriteOpen}
        onOpenChange={(open) => {
          setOverwriteOpen(open);
          if (!open) {
            afterSaveRef.current = null;
          }
        }}
        onConfirm={() => {
          if (pendingSavePath) {
            void performSave(
              pendingSavePath,
              pendingSaveAssetType ?? assetType,
            );
          }
        }}
        isSubmitting={isSubmitting}
      />
      <UnsavedChangesDialog
        open={unsavedOpen}
        onOpenChange={(open) => {
          setUnsavedOpen(open);
          if (!open) {
            clearPendingNavigation();
          }
        }}
        onDiscard={handleDiscardNavigation}
        onSave={handleSaveBeforeNavigation}
        canSave={Boolean(projectId)}
      />
    </>
  );

  return {
    onNewProject: handleNewProjectRequest,
    onOpenProject: handleOpenProjectRequest,
    onSave: () => void handleSave(),
    onSaveAs: () => {
      setDialogError(null);
      setSaveAsDialogOpen(true);
    },
    canSave: Boolean(projectId),
    isFileNavigationDisabled: navigationBlocked,
    dialogs,
  };
}
