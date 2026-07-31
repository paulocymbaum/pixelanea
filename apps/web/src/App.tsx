import { useEffect, useState } from "react";
import { checkHealth } from "@/api/health";
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

  const openEditor = (entryPath: "blank" | "import") => {
    setShowOnboarding(entryPath === "blank");
    setRoute("editor");
  };

  const goToNewProject = () => {
    setRoute("new-project");
  };

  const startImport = () => {
    resetImportWizard();
    setRoute("import-wizard");
  };

  if (route === "editor" && projectId) {
    return <EditorPage showOnboarding={showOnboarding} onNewProject={goToNewProject} />;
  }

  if (route === "import-wizard") {
    return (
      <ImportWizardPage
        onComplete={() => {
          setShowOnboarding(false);
          setRoute("editor");
        }}
        onBack={() => setRoute("new-project")}
      />
    );
  }

  return (
    <NewProjectPage
      onOpenEditor={openEditor}
      onStartImport={startImport}
    />
  );
}
