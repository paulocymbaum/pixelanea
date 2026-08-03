import { useCallback } from "react";
import { basename } from "@/components/project/pathUtils";
import { copy } from "@/content/copy";
import { useDerivedProjectStatus } from "@/lib/projectStatus";
import { useBundlePath, useProjectName } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { Button } from "@/components/ui";
import { OffPaletteExportDialog } from "@/components/project/OffPaletteExportDialog";
import { useProjectFileActions } from "@/components/project/useProjectFileActions";
import { FileMenu } from "./FileMenu";
import { runGifExport, runPngExport, runSpritesheetExport, useOffPaletteExportGuard } from "./exportActions";
import { buildFileMenuItems } from "./fileMenuItems";
import { ThemeToggle } from "./ThemeToggle";
import { ViewMenu } from "./ViewMenu";

type AppHeaderProps = {
  onNewProject: () => void;
  onImportImage?: () => void;
  onProjectOpened?: () => void;
};

export function AppHeader({
  onNewProject,
  onImportImage,
  onProjectOpened,
}: AppHeaderProps) {
  const projectName = useProjectName();
  const bundlePath = useBundlePath();
  const projectStatus = useDerivedProjectStatus();
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const setShowTechnicalInfo = useUiStore((s) => s.setShowTechnicalInfo);

  const fileActions = useProjectFileActions({
    onNewProject,
    onProjectOpened,
  });

  const offPaletteGuard = useOffPaletteExportGuard();

  const handleExportPng = useCallback(() => {
    runPngExport(offPaletteGuard.runGuardedExport).catch(() => {
      // Export errors surface via sync/toast layers; header stays non-blocking.
    });
  }, [offPaletteGuard.runGuardedExport]);

  const handleExportSpritesheet = useCallback(() => {
    runSpritesheetExport(offPaletteGuard.runGuardedExport).catch(() => {
      // Export errors surface via sync/toast layers; header stays non-blocking.
    });
  }, [offPaletteGuard.runGuardedExport]);

  const handleExportGif = useCallback(() => {
    runGifExport(offPaletteGuard.runGuardedExport).catch(() => {
      // Export errors surface via sync/toast layers; header stays non-blocking.
    });
  }, [offPaletteGuard.runGuardedExport]);

  const fileItems = buildFileMenuItems({
    fileActions,
    onImportImage,
    onExportPng: handleExportPng,
    onExportSpritesheet: handleExportSpritesheet,
    onExportGif: handleExportGif,
  });

  return (
    <>
      <header
        className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-4"
        role="banner"
      >
        <div className="flex items-center gap-2">
          <img
            src="/logo-glyph.svg"
            alt=""
            className="h-6 w-6"
            width={24}
            height={24}
          />
          <span className="text-md font-semibold text-primary">{copy.appName}</span>
        </div>

        <nav className="flex items-center gap-1" aria-label="Main menu">
          <FileMenu items={fileItems} />
          <ViewMenu
            showTechnicalInfo={showTechnicalInfo}
            onShowTechnicalInfoChange={setShowTechnicalInfo}
          />
        </nav>

        <div className="min-w-0 flex-1 text-center text-md text-primary">
          <div className="truncate">{projectName}</div>
          {bundlePath ? (
            <div
              className="truncate text-xs font-normal text-secondary"
              title={bundlePath}
            >
              {basename(bundlePath)}
            </div>
          ) : null}
          {projectStatus.kind === "unsaved" ? (
            <span
              className="ml-2 inline-block h-2 w-2 shrink-0 rounded-full bg-warning align-middle"
              aria-label={copy.statusUnsaved}
              title={copy.statusUnsaved}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={fileActions.onSave}
            disabled={!fileActions.canSave || fileActions.isSaving}
          >
            {copy.fileMenuSave}
          </Button>
          <ThemeToggle />
        </div>
      </header>
      {fileActions.dialogs}
      <OffPaletteExportDialog
        open={offPaletteGuard.dialogOpen}
        report={offPaletteGuard.report}
        onOpenChange={offPaletteGuard.handleOpenChange}
        onConfirm={offPaletteGuard.handleConfirm}
      />
    </>
  );
}
