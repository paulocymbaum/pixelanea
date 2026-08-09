import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { checkHealth } from "@/api/health";
import { UpdateDialog } from "@/components/update/UpdateDialog";
import { useProjectFileActions } from "@/components/project/useProjectFileActions";
import { UnsavedChangesDialog } from "@/components/project/UnsavedChangesDialog";
import { applyHealthCheckResult } from "@/lib/apiHealth";
import {
  clearStartupOpenPathFromUrl,
  readStartupOpenPath,
  type PixelaneaShellWindow,
} from "@/lib/startupOpenPath";
import {
  getEditorNavigationGuardState,
  needsNavigationGuard,
} from "@/lib/unsavedGuard";
import { isDesktopShell } from "@/lib/desktop";
import { useStartupDesktopUpdateCheck } from "@/hooks/useStartupDesktopUpdateCheck";
import { EditorPage } from "@/pages/EditorPage";
import { ImportWizardPage } from "@/pages/ImportWizardPage";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { ConnectionBanner } from "@/shell/ConnectionBanner";
import { useThemeBootstrap } from "@/shell/useThemeBootstrap";
import { useEditorStore, useSyncStatus } from "@/state/editorStore";
import { useUiStore, useApiStatus } from "@/state/uiStore";

export type AppRoute = "new-project" | "import-wizard" | "editor";

export function App() {
  useThemeBootstrap();

  const [route, setRoute] = useState<AppRoute>("new-project");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [routeGuardOpen, setRouteGuardOpen] = useState(false);
  const pendingRouteRef = useRef<AppRoute | null>(null);
  const projectId = useEditorStore((s) => s.projectId);
  const setApiStatus = useUiStore((s) => s.setApiStatus);
  const resetImportWizard = useUiStore((s) => s.resetImportWizard);
  const updateDialogOpen = useUiStore((s) => s.updateDialogOpen);
  const setUpdateDialogOpen = useUiStore((s) => s.setUpdateDialogOpen);
  const startupUpdateDismissedVersion = useUiStore(
    (s) => s.startupUpdateDismissedVersion,
  );
  const setStartupUpdateDismissedVersion = useUiStore(
    (s) => s.setStartupUpdateDismissedVersion,
  );
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const { version } = useApiStatus();
  const desktopShell = isDesktopShell();
  const isDirty = useEditorStore((s) => s.isDirty);
  const isPaletteDirty = useEditorStore((s) => s.isPaletteDirty);
  const bundleDirty = useEditorStore((s) => s.bundleDirty);
  const syncStatus = useSyncStatus();

  const goToNewProject = useCallback(() => {
    setRoute("new-project");
  }, []);

  const handleProjectOpened = useCallback(() => {
    setShowOnboarding(false);
    setRoute("editor");
  }, []);

  const projectFileActions = useProjectFileActions({
    onNewProject: goToNewProject,
    onProjectOpened: handleProjectOpened,
  });
  const { openProjectAtPath } = projectFileActions;
  const startupOpenHandledRef = useRef(false);
  const onNewProjectRoute = route === "new-project";
  const startupUpdateCheck = useStartupDesktopUpdateCheck(onNewProjectRoute);
  const startupUpdate =
    startupUpdateCheck &&
    startupUpdateCheck.latestVersion !== startupUpdateDismissedVersion
      ? startupUpdateCheck
      : null;

  const handleStartupUpdateInstall = useCallback(() => {
    setUpdateDialogOpen(true);
  }, [setUpdateDialogOpen]);

  const handleStartupUpdateDismiss = useCallback(() => {
    if (startupUpdateCheck) {
      setStartupUpdateDismissedVersion(startupUpdateCheck.latestVersion);
    }
  }, [setStartupUpdateDismissedVersion, startupUpdateCheck]);

  useEffect(() => {
    let cancelled = false;

    checkHealth().then((result) => {
      if (cancelled) return;
      applyHealthCheckResult(result, setApiStatus);
    });

    return () => {
      cancelled = true;
    };
  }, [setApiStatus]);

  useEffect(() => {
    const shellWindow = window as PixelaneaShellWindow;
    shellWindow.__pixelaneaOpenProject = (path: string) => {
      void openProjectAtPath(path);
    };

    return () => {
      delete shellWindow.__pixelaneaOpenProject;
    };
  }, [openProjectAtPath]);

  useEffect(() => {
    if (startupOpenHandledRef.current) {
      return;
    }
    const startupPath = readStartupOpenPath();
    if (!startupPath) {
      return;
    }
    startupOpenHandledRef.current = true;
    clearStartupOpenPathFromUrl();
    void openProjectAtPath(startupPath);
  }, [openProjectAtPath]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useEditorStore.getState();
      if (state.projectId && needsNavigationGuard(getEditorNavigationGuardState())) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const requestEditorRouteChange = useCallback((nextRoute: AppRoute) => {
    const state = useEditorStore.getState();
    if (state.projectId && needsNavigationGuard(getEditorNavigationGuardState())) {
      pendingRouteRef.current = nextRoute;
      setRouteGuardOpen(true);
      return;
    }

    if (nextRoute === "import-wizard") {
      resetImportWizard();
    }
    setRoute(nextRoute);
  }, [resetImportWizard]);

  const openEditor = (entryPath: "blank" | "import") => {
    setShowOnboarding(entryPath === "blank");
    setRoute("editor");
  };

  const startImport = useCallback(() => {
    if (route === "editor" && projectId) {
      requestEditorRouteChange("import-wizard");
      return;
    }
    resetImportWizard();
    setRoute("import-wizard");
  }, [projectId, requestEditorRouteChange, resetImportWizard, route]);

  const handleRouteGuardDiscard = useCallback(() => {
    setRouteGuardOpen(false);
    const nextRoute = pendingRouteRef.current;
    pendingRouteRef.current = null;
    if (!nextRoute) {
      return;
    }
    if (nextRoute === "import-wizard") {
      resetImportWizard();
    }
    setRoute(nextRoute);
  }, [resetImportWizard]);

  const handleRouteGuardSave = useCallback(() => {
    setRouteGuardOpen(false);
    const nextRoute = pendingRouteRef.current;
    pendingRouteRef.current = null;
    if (!nextRoute) {
      return;
    }

    projectFileActions.saveThen(() => {
      if (nextRoute === "import-wizard") {
        resetImportWizard();
      }
      setRoute(nextRoute);
    });
  }, [projectFileActions, resetImportWizard]);

  const routeGuardDialog = (
    <UnsavedChangesDialog
      open={routeGuardOpen}
      onOpenChange={(open) => {
        setRouteGuardOpen(open);
        if (!open) {
          pendingRouteRef.current = null;
        }
      }}
      onDiscard={handleRouteGuardDiscard}
      onSave={handleRouteGuardSave}
      canSave={projectFileActions.canSave}
    />
  );

  let page: ReactNode;

  if (route === "editor" && projectId) {
    page = (
      <EditorPage
        showOnboarding={showOnboarding}
        onNewProject={goToNewProject}
        onImportImage={startImport}
      />
    );
  } else if (route === "import-wizard") {
    page = (
      <ImportWizardPage
        onComplete={() => {
          setShowOnboarding(false);
          setRoute("editor");
        }}
        onBack={() => setRoute("new-project")}
      />
    );
  } else {
    page = (
      <NewProjectPage
        onOpenEditor={openEditor}
        onStartImport={startImport}
        onOpenExisting={projectFileActions.onOpenProject}
        startupUpdate={startupUpdate}
        showTechnicalInfo={showTechnicalInfo}
        onStartupUpdateInstall={handleStartupUpdateInstall}
        onStartupUpdateDismiss={handleStartupUpdateDismiss}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ConnectionBanner />
      {page}
      {route !== "import-wizard" ? projectFileActions.dialogs : null}
      {routeGuardDialog}
      {desktopShell ? (
        <UpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          currentVersion={version}
          showTechnicalInfo={showTechnicalInfo}
          hasUnsavedWork={
            projectId
              ? needsNavigationGuard({
                  isDirty,
                  isPaletteDirty,
                  bundleDirty,
                  syncStatus,
                })
              : false
          }
          canSave={projectFileActions.canSave}
          isSaving={projectFileActions.isSaving}
          onSave={projectFileActions.onSave}
        />
      ) : null}
    </div>
  );
}
