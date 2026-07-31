import { checkHealth } from "@/api/health";
import { TooltipProvider } from "@/components/ui";
import { useProjectBootstrap } from "@/hooks/useProjectBootstrap";
import { AppHeader } from "@/shell/AppHeader";
import { useThemeBootstrap } from "@/shell/useThemeBootstrap";
import { EditorLayout } from "@/shell/EditorLayout";
import { useEditorShortcuts } from "@/state/shortcuts";
import { useUiStore } from "@/state/uiStore";
import { useEffect } from "react";

export function EditorPage() {
  useThemeBootstrap();
  useEditorShortcuts();

  const apiStatus = useUiStore((s) => s.apiStatus);
  const setApiStatus = useUiStore((s) => s.setApiStatus);

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

  useProjectBootstrap(apiStatus === "connected");

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col">
        <AppHeader />
        <EditorLayout />
      </div>
    </TooltipProvider>
  );
}
