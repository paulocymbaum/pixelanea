import { useCallback, useRef, useState } from "react";
import type { AssetType } from "@pixelanea/api-client";
import {
  openProjectFromBundle,
  closeProjectSession,
  saveProjectToBundle,
} from "@/api/projects";
import { DEFAULT_ASSET_TYPE } from "@/content/assetTypes";
import { errors } from "@/content/errors";
import { copy } from "@/content/copy";
import { loadProjectIntoEditor } from "@/lib/loadProject";
import {
  pickProjectPath,
  type PickProjectPathInput,
  type PickProjectPathResult,
} from "@/lib/filePicker";
import {
  isNavigationBlocked,
  needsNavigationGuard,
} from "@/lib/unsavedGuard";
import { useEditorStore, useSyncStatus } from "@/state/editorStore";
import { flushAllSync } from "@/state/persist";
import { useUiStore } from "@/state/uiStore";
import { OverwriteConfirmDialog } from "./OverwriteConfirmDialog";
import { ProjectPathDialog } from "./ProjectPathDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { deriveDefaultName } from "./pathUtils";

type UseProjectFileActionsOptions = {
  onNewProject: () => void;
  onProjectOpened?: () => void;
};

type PendingFallbackPick = {
  mode: PickProjectPathInput["mode"];
  resolve: (result: PickProjectPathResult) => void;
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
  const bundleDirty = useEditorStore((s) => s.bundleDirty);
  const syncStatus = useSyncStatus();
  const setBundlePath = useEditorStore((s) => s.setBundlePath);
  const setAssetType = useEditorStore((s) => s.setAssetType);
  const showToast = useUiStore((s) => s.showToast);

  const [pathDialogIsFallback, setPathDialogIsFallback] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  /** Runs once the save started from the unsaved-work prompt succeeds. */
  const afterSaveRef = useRef<(() => void) | null>(null);
  /** Navigation to run after the user discards unsaved work. */
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const pendingFallbackPickRef = useRef<PendingFallbackPick | null>(null);
  const fallbackSaveHandledRef = useRef(false);
  const [pendingSavePath, setPendingSavePath] = useState<string | null>(null);
  const [pendingSaveAssetType, setPendingSaveAssetType] = useState<AssetType | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const guardState = {
    isDirty,
    isPaletteDirty,
    bundleDirty,
    syncStatus,
  };
  const navigationBlocked = isNavigationBlocked(guardState);

  const resolvePendingFallbackPick = useCallback((result: PickProjectPathResult) => {
    const pending = pendingFallbackPickRef.current;
    if (!pending) {
      return false;
    }

    pendingFallbackPickRef.current = null;
    pending.resolve(result);
    return true;
  }, []);

  const cancelPendingFallbackPick = useCallback(() => {
    resolvePendingFallbackPick({ ok: false, cancelled: true });
  }, [resolvePendingFallbackPick]);

  const tryFallbackDialog = useCallback(
    async (input: PickProjectPathInput): Promise<PickProjectPathResult> =>
      new Promise((resolve) => {
        pendingFallbackPickRef.current = { mode: input.mode, resolve };
        setPathDialogIsFallback(true);
        setDialogError(null);
        if (input.mode === "open") {
          setOpenDialogOpen(true);
        } else {
          setSaveAsDialogOpen(true);
        }
      }),
    [],
  );

  const pickProjectPathWithFallback = useCallback(
    async (input: PickProjectPathInput): Promise<PickProjectPathResult> =>
      pickProjectPath(input, { tiers: { tryFallbackDialog } }),
    [tryFallbackDialog],
  );

  const handlePickerFailure = useCallback(
    (result: Extract<PickProjectPathResult, { ok: false }>) => {
      if (result.cancelled) {
        return;
      }
      showToast(result.message);
    },
    [showToast],
  );

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
        showToast(result.message || errors.saveProjectFailed);
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
    if (!projectId || navigationBlocked) {
      return;
    }

    if (!bundlePath) {
      fallbackSaveHandledRef.current = false;
      const result = await pickProjectPathWithFallback({
        mode: "saveAs",
        defaultPath: bundlePath ?? undefined,
        defaultName: deriveDefaultName(bundlePath),
      });
      if (!result.ok) {
        handlePickerFailure(result);
        return;
      }

      if (fallbackSaveHandledRef.current) {
        return;
      }

      setPendingSavePath(result.path);
      setPendingSaveAssetType(DEFAULT_ASSET_TYPE);
      setOverwriteOpen(true);
      return;
    }

    await performSave(bundlePath, assetType);
  }, [
    assetType,
    bundlePath,
    handlePickerFailure,
    navigationBlocked,
    performSave,
    pickProjectPathWithFallback,
    projectId,
  ]);

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
  }, []);

  const requestGuardedNavigation = useCallback(
    (action: () => void) => {
      const state = { isDirty, isPaletteDirty, bundleDirty, syncStatus };
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
    [bundleDirty, isDirty, isPaletteDirty, syncStatus],
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
      if (pendingFallbackPickRef.current?.mode === "saveAs") {
        resolvePendingFallbackPick({ ok: true, path });
        fallbackSaveHandledRef.current = true;
        setSaveAsDialogOpen(false);
        setPendingSavePath(path);
        setPendingSaveAssetType(nextAssetType ?? DEFAULT_ASSET_TYPE);
        setOverwriteOpen(true);
        return;
      }

      setPendingSavePath(path);
      setPendingSaveAssetType(nextAssetType ?? assetType);
      setOverwriteOpen(true);
    },
    [assetType, resolvePendingFallbackPick],
  );

  const executeOpen = useCallback(
    async (path: string) => {
      setIsSubmitting(true);
      setDialogError(null);
      setOpenDialogOpen(true);

      // Loading a project resets the sync queue, so land any pending edits of
      // the current project before the switch instead of dropping them.
      await flushAllSync();

      if (projectId && bundlePath === path) {
        await closeProjectSession(projectId);
      }

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
    [bundlePath, onProjectOpened, projectId],
  );

  const handleOpenRequest = useCallback(
    async ({ path }: { path: string }) => {
      if (pendingFallbackPickRef.current?.mode === "open") {
        resolvePendingFallbackPick({ ok: true, path });
        return;
      }

      await executeOpen(path);
    },
    [executeOpen, resolvePendingFallbackPick],
  );

  const pickAndOpenProject = useCallback(async () => {
    const result = await pickProjectPathWithFallback({
      mode: "open",
      defaultPath: bundlePath ?? undefined,
    });
    if (!result.ok) {
      handlePickerFailure(result);
      return;
    }

    await executeOpen(result.path);
  }, [bundlePath, executeOpen, handlePickerFailure, pickProjectPathWithFallback]);

  const pickAndSaveAs = useCallback(async () => {
    if (navigationBlocked) {
      return;
    }

    fallbackSaveHandledRef.current = false;
    const result = await pickProjectPathWithFallback({
      mode: "saveAs",
      defaultPath: bundlePath ?? undefined,
      defaultName: deriveDefaultName(bundlePath),
    });
    if (!result.ok) {
      handlePickerFailure(result);
      return;
    }

    if (fallbackSaveHandledRef.current) {
      return;
    }

    setPendingSavePath(result.path);
    setPendingSaveAssetType(DEFAULT_ASSET_TYPE);
    setOverwriteOpen(true);
  }, [bundlePath, handlePickerFailure, navigationBlocked, pickProjectPathWithFallback]);

  const handleOpenProjectRequest = useCallback(() => {
    requestGuardedNavigation(() => {
      void pickAndOpenProject();
    });
  }, [pickAndOpenProject, requestGuardedNavigation]);

  const dialogs = (
    <>
      <ProjectPathDialog
        open={openDialogOpen}
        onOpenChange={(open) => {
          setOpenDialogOpen(open);
          if (!open) {
            cancelPendingFallbackPick();
            setPathDialogIsFallback(false);
            setDialogError(null);
          }
        }}
        mode="open"
        isFallback={pathDialogIsFallback}
        onSubmit={handleOpenRequest}
        isSubmitting={isSubmitting}
        error={openDialogOpen ? dialogError : null}
      />
      <ProjectPathDialog
        open={saveAsDialogOpen}
        onOpenChange={(open) => {
          setSaveAsDialogOpen(open);
          if (!open) {
            cancelPendingFallbackPick();
            setPathDialogIsFallback(false);
            setDialogError(null);
            afterSaveRef.current = null;
          }
        }}
        mode="saveAs"
        isFallback={pathDialogIsFallback}
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
            setDialogError(null);
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
        error={overwriteOpen ? dialogError : null}
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
        canSave={Boolean(projectId) && !navigationBlocked}
      />
    </>
  );

  return {
    onNewProject: handleNewProjectRequest,
    onOpenProject: handleOpenProjectRequest,
    onSave: () => void handleSave(),
    onSaveAs: () => {
      void pickAndSaveAs();
    },
    canSave: Boolean(projectId) && !navigationBlocked,
    isSaving: isSubmitting,
    isFileNavigationDisabled: navigationBlocked,
    dialogs,
  };
}
