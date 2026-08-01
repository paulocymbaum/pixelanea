import { useCallback, useEffect, useRef, useState } from "react";
import { checkHealth } from "@/api/health";
import { UnsavedChangesDialog } from "@/components/project/UnsavedChangesDialog";
import { needsNavigationGuard } from "@/lib/unsavedGuard";
import { EditorPage } from "@/pages/EditorPage";
import { ImportWizardPage } from "@/pages/ImportWizardPage";
import { NewProjectPage } from "@/pages/NewProjectPage";
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

  useEffect(() => {
    let cancelled = false;

    checkHealth().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setApiStatus("connected", result.health.version);
      } else {
        setApiStatus("disconnected");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setApiStatus]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useEditorStore.getState();
      if (
        state.projectId &&
        needsNavigationGuard({
          isDirty: state.isDirty,
          isPaletteDirty: state.isPaletteDirty,
          syncStatus: state.syncStatus,
        })
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const requestEditorRouteChange = useCallback((nextRoute: AppRoute) => {
    const state = useEditorStore.getState();
    if (
      state.projectId &&
      needsNavigationGuard({
        isDirty: state.isDirty,
        isPaletteDirty: state.isPaletteDirty,
        syncStatus: state.syncStatus,
      })
    ) {
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

  // File → New is guarded in useProjectFileActions before this runs.
  const goToNewProject = useCallback(() => {
    setRoute("new-project");
  }, []);

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
    />
  );

  if (route === "editor" && projectId) {
    return (
      <>
        <EditorPage showOnboarding={showOnboarding} onNewProject={goToNewProject} />
        {routeGuardDialog}
      </>
    );
  }

  if (route === "import-wizard") {
    return (
      <>
        <ImportWizardPage
          onComplete={() => {
            setShowOnboarding(false);
            setRoute("editor");
          }}
          onBack={() => setRoute("new-project")}
        />
        {routeGuardDialog}
      </>
    );
  }

  return (
    <>
      <NewProjectPage onOpenEditor={openEditor} onStartImport={startImport} />
      {routeGuardDialog}
    </>
  );
}
