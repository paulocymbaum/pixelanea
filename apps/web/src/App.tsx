import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { checkHealth } from "@/api/health";
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
import { EditorPage } from "@/pages/EditorPage";
import { ImportWizardPage } from "@/pages/ImportWizardPage";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { ConnectionBanner } from "@/shell/ConnectionBanner";
import { useThemeBootstrap } from "@/shell/useThemeBootstrap";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";

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
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ConnectionBanner />
      {page}
      {route !== "import-wizard" ? projectFileActions.dialogs : null}
      {routeGuardDialog}
    </div>
  );
}
