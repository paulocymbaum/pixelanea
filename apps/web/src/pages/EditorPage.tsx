import { SkippableOverlay } from "@/components/onboarding/SkippableOverlay";
import { ShortcutsOverlay } from "@/components/onboarding/ShortcutsOverlay";
import { Toast } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui";
import { AppHeader } from "@/shell/AppHeader";
import { EditorLayout } from "@/shell/EditorLayout";
import { useEditorShortcuts } from "@/state/shortcuts";
import { useUiStore } from "@/state/uiStore";
import { useEffect } from "react";

type EditorPageProps = {
  showOnboarding?: boolean;
  onNewProject: () => void;
  onImportImage?: () => void;
};

export function EditorPage({
  showOnboarding = false,
  onNewProject,
  onImportImage,
}: EditorPageProps) {
  useEditorShortcuts();

  const apiStatus = useUiStore((s) => s.apiStatus);
  const onboardingDismissed = useUiStore((s) => s.onboardingDismissed);
  const setOnboardingStep = useUiStore((s) => s.setOnboardingStep);

  useEffect(() => {
    if (showOnboarding && !onboardingDismissed) {
      setOnboardingStep(0);
    }
  }, [showOnboarding, onboardingDismissed, setOnboardingStep]);

  const shouldShowOnboarding =
    showOnboarding && !onboardingDismissed && apiStatus === "connected";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col">
        <AppHeader
          onNewProject={onNewProject}
          onImportImage={onImportImage}
        />
        <EditorLayout />
        {shouldShowOnboarding ? <SkippableOverlay /> : null}
        <ShortcutsOverlay />
        <Toast />
      </div>
    </TooltipProvider>
  );
}
