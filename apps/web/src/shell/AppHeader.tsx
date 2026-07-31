import { useCallback, useRef, useState } from "react";
import {
  downloadBlob,
  exportFilename,
  exportFrameToPng,
  exportGifFilename,
  exportSpritesheetFilename,
  exportSpritesheetToPng,
} from "@/canvas/exportFrame";
import {
  scanFramesForOffPalette,
  type OffPaletteReport,
} from "@/canvas/offPaletteCheck";
import { copy } from "@/content/copy";
import { exportProjectGif } from "@/api/export";
import {
  useActiveFrameIndex,
  useCanRedo,
  useCanUndo,
  useEditorStore,
  useFrameCount,
  useProjectName,
} from "@/state/editorStore";
import {
  applyThemeToDocument,
  resolveTheme,
  useSessionStore,
  type ThemeMode,
} from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { OffPaletteExportDialog } from "@/components/project/OffPaletteExportDialog";
import { useProjectFileActions } from "@/components/project/useProjectFileActions";
import { flushFrameSync } from "@/state/persist";
import { resolveAllFramePixels } from "@/state/frameCache";
import { Moon, Sun } from "lucide-react";

type AppHeaderProps = {
  onNewProject: () => void;
  onProjectOpened?: () => void;
};

function ThemeToggle() {
  const theme = useSessionStore((s) => s.theme);
  const setTheme = useSessionStore((s) => s.setTheme);

  const cycleTheme = () => {
    const resolved = resolveTheme(theme);
    const next: ThemeMode = resolved === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDocument(next);
  };

  const resolved = resolveTheme(theme);
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label="Toggle theme"
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </Button>
  );
}

export function AppHeader({ onNewProject, onProjectOpened }: AppHeaderProps) {
  const projectName = useProjectName();
  const frameIndex = useActiveFrameIndex();
  const frameCount = useFrameCount();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const fitToView = useEditorStore((s) => s.fitToView);
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const setShowTechnicalInfo = useUiStore((s) => s.setShowTechnicalInfo);

  const fileActions = useProjectFileActions({
    onNewProject,
    onProjectOpened,
  });

  const [offPaletteDialogOpen, setOffPaletteDialogOpen] = useState(false);
  const [offPaletteReport, setOffPaletteReport] =
    useState<OffPaletteReport | null>(null);
  const pendingExportRef = useRef<(() => void) | null>(null);

  const runExportWithOffPaletteGuard = useCallback(
    (
      frames: readonly Uint8Array[],
      paletteLength: number,
      proceed: () => void,
    ) => {
      const report = scanFramesForOffPalette(frames, paletteLength);
      if (!report.hasOffPalette) {
        proceed();
        return;
      }

      pendingExportRef.current = proceed;
      setOffPaletteReport(report);
      setOffPaletteDialogOpen(true);
    },
    [],
  );

  const handleOffPaletteConfirm = () => {
    setOffPaletteDialogOpen(false);
    pendingExportRef.current?.();
    pendingExportRef.current = null;
    setOffPaletteReport(null);
  };

  const handleOffPaletteOpenChange = (open: boolean) => {
    setOffPaletteDialogOpen(open);
    if (!open) {
      pendingExportRef.current = null;
      setOffPaletteReport(null);
    }
  };

  const handleExportPng = () => {
    const state = useEditorStore.getState();
    if (!state.projectId) {
      return;
    }

    runExportWithOffPaletteGuard(
      [state.pixels],
      state.paletteColors.length,
      () => {
        exportFrameToPng({
          pixels: state.pixels,
          gridWidth: state.gridWidth,
          gridHeight: state.gridHeight,
          paletteColors: state.paletteColors,
          filename: exportFilename(state.projectName, state.activeFrameIndex),
        });
      },
    );
  };

  const handleExportSpritesheet = () => {
    void (async () => {
      const state = useEditorStore.getState();
      if (!state.projectId || state.frameCount <= 1) {
        return;
      }

      if (state.isDirty) {
        await flushFrameSync();
      }

      const resolved = await resolveAllFramePixels({
        projectId: state.projectId,
        frameCount: state.frameCount,
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        activeFrameIndex: state.activeFrameIndex,
        activePixels: state.pixels,
        framePixelsByIndex: state.framePixelsByIndex,
      });

      if (!resolved.ok) {
        state.setSyncStatus("error", resolved.message);
        return;
      }

      useEditorStore.setState({
        framePixelsByIndex: resolved.framePixelsByIndex,
      });

      runExportWithOffPaletteGuard(
        resolved.frames,
        state.paletteColors.length,
        () => {
          exportSpritesheetToPng({
            frames: resolved.frames,
            gridWidth: state.gridWidth,
            gridHeight: state.gridHeight,
            paletteColors: state.paletteColors,
            filename: exportSpritesheetFilename(state.projectName),
          });
        },
      );
    })();
  };

  const handleExportGif = () => {
    void (async () => {
      const state = useEditorStore.getState();
      if (!state.projectId || state.frameCount <= 1) {
        return;
      }

      if (state.isDirty) {
        await flushFrameSync();
      }

      const resolved = await resolveAllFramePixels({
        projectId: state.projectId,
        frameCount: state.frameCount,
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        activeFrameIndex: state.activeFrameIndex,
        activePixels: state.pixels,
        framePixelsByIndex: state.framePixelsByIndex,
      });

      if (!resolved.ok) {
        state.setSyncStatus("error", resolved.message);
        return;
      }

      useEditorStore.setState({
        framePixelsByIndex: resolved.framePixelsByIndex,
      });

      runExportWithOffPaletteGuard(
        resolved.frames,
        state.paletteColors.length,
        () => {
          void (async () => {
            try {
              const blob = await exportProjectGif(state.projectId!, {
                fps: state.animationFps,
                loop: state.animationLoop,
              });
              downloadBlob(blob, exportGifFilename(state.projectName));
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "GIF export failed";
              state.setSyncStatus("error", message);
            }
          })();
        },
      );
    })();
  };

  const fileItems = [
    { label: copy.fileMenuNew, action: fileActions.onNewProject },
    { label: copy.fileMenuOpen, action: fileActions.onOpenProject },
    {
      label: copy.fileMenuSave,
      action: fileActions.onSave,
      disabled: !fileActions.canSave,
    },
    {
      label: copy.fileMenuSaveAs,
      action: fileActions.onSaveAs,
      disabled: !fileActions.canSave,
    },
    {
      label: copy.fileMenuExportPng,
      action: handleExportPng,
      disabled: !fileActions.canSave,
    },
    {
      label: copy.fileMenuExportSpritesheet,
      action: handleExportSpritesheet,
      disabled: !fileActions.canSave || frameCount <= 1,
    },
    {
      label: copy.fileMenuExportGif,
      action: handleExportGif,
      disabled: !fileActions.canSave || frameCount <= 1,
    },
  ];

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
          <EditMenu
            onUndo={() => undo()}
            onRedo={() => redo()}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <ViewMenu
            onZoomIn={() => zoomIn()}
            onZoomOut={() => zoomOut()}
            onFit={() => fitToView()}
            showTechnicalInfo={showTechnicalInfo}
            onShowTechnicalInfoChange={setShowTechnicalInfo}
          />
        </nav>

        <div className="flex-1 text-center text-md text-primary">
          {projectName}
          {frameCount > 1 ? ` · Frame ${frameIndex + 1}` : null}
        </div>

        <ThemeToggle />
      </header>
      {fileActions.dialogs}
      <OffPaletteExportDialog
        open={offPaletteDialogOpen}
        report={offPaletteReport}
        onOpenChange={handleOffPaletteOpenChange}
        onConfirm={handleOffPaletteConfirm}
      />
    </>
  );
}

type FileMenuItem = {
  label: string;
  action: () => void;
  disabled?: boolean;
};

function FileMenu({ items }: { items: FileMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            onSelect={() => item.action()}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type EditMenuProps = {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

function EditMenu({ onUndo, onRedo, canUndo, canRedo }: EditMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          Edit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem disabled={!canUndo} onSelect={onUndo}>
          {copy.editMenuUndo}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canRedo} onSelect={onRedo}>
          {copy.editMenuRedo}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ViewMenuProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  showTechnicalInfo: boolean;
  onShowTechnicalInfoChange: (show: boolean) => void;
};

function ViewMenu({
  onZoomIn,
  onZoomOut,
  onFit,
  showTechnicalInfo,
  onShowTechnicalInfoChange,
}: ViewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onZoomIn}>{copy.zoomIn}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onZoomOut}>{copy.zoomOut}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onFit}>{copy.zoomFit}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showTechnicalInfo}
          onCheckedChange={onShowTechnicalInfoChange}
          onSelect={(event) => event.preventDefault()}
        >
          {copy.viewMenuShowTechnicalInfo}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
