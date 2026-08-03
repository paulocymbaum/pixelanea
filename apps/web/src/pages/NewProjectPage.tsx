import { useState } from "react";
import { FolderOpen, ImagePlus, Pencil } from "lucide-react";
import { createBlankProject } from "@/api/projects";
import { Button } from "@/components/ui/Button";
import type { AnimationFramePreset } from "@/components/project/animationFramePresets";
import { CanvasSizeStep } from "@/components/project/CanvasSizeStep";
import type { CanvasSize } from "@/components/project/canvasSize";
import { matchesResolutionPreset } from "@/components/project/canvasSize";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { loadProjectIntoEditor } from "@/lib/loadProject";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";

type NewProjectPageProps = {
  onOpenEditor: (entryPath: "blank" | "import") => void;
  onStartImport: () => void;
  onOpenExisting?: () => void;
};

function newProjectEntryCardClass(selected: boolean): string {
  return cn(
    "flex min-h-40 flex-col items-center justify-center gap-3 rounded-panel border-2 bg-elevated p-6 text-center transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    selected ? "border-accent bg-accent-muted" : "border-border",
  );
}

export function NewProjectPage({
  onOpenEditor,
  onStartImport,
  onOpenExisting,
}: NewProjectPageProps) {
  const hasVisited = useSessionStore((s) => s.hasVisited);
  const lastEntryPath = useSessionStore((s) => s.lastEntryPath);
  const lastCanvasSize = useSessionStore((s) => s.lastCanvasSize);
  const setHasVisited = useSessionStore((s) => s.setHasVisited);
  const setLastEntryPath = useSessionStore((s) => s.setLastEntryPath);
  const setLastResolution = useSessionStore((s) => s.setLastResolution);
  const setLastCanvasSize = useSessionStore((s) => s.setLastCanvasSize);
  const setLastFrameCount = useSessionStore((s) => s.setLastFrameCount);
  const setOnboardingDismissed = useUiStore((s) => s.setOnboardingDismissed);

  const [selectedPath, setSelectedPath] = useState<"blank" | "import" | null>(
    null,
  );
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(lastCanvasSize);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBlank = async (
    size: CanvasSize,
    frames: AnimationFramePreset,
  ) => {
    setIsCreating(true);
    setError(null);

    const created = await createBlankProject({
      name: copy.projectPlaceholder,
      width: size.width,
      height: size.height,
      frameCount: frames,
      fps: 8,
      cellSize: 16,
      loop: true,
    });

    if (!created.ok) {
      setError(created.message);
      setIsCreating(false);
      return;
    }

    const loaded = await loadProjectIntoEditor(created.project.id);
    if (!loaded.ok) {
      setError(loaded.message);
      setIsCreating(false);
      return;
    }

    setLastCanvasSize(size);
    if (matchesResolutionPreset(size, 16)) {
      setLastResolution(16);
    } else if (matchesResolutionPreset(size, 32)) {
      setLastResolution(32);
    } else if (matchesResolutionPreset(size, 64)) {
      setLastResolution(64);
    } else if (matchesResolutionPreset(size, 128)) {
      setLastResolution(128);
    } else if (matchesResolutionPreset(size, 256)) {
      setLastResolution(256);
    }
    setLastFrameCount(frames);
    setLastEntryPath("blank");
    setHasVisited(true);
    setOnboardingDismissed(false);
    setIsCreating(false);
    onOpenEditor("blank");
  };

  const quickStartImport = () => {
    onStartImport();
  };

  const quickStartBlank = (size: CanvasSize, frames: AnimationFramePreset) => {
    void createBlank(size, frames);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6">
      <div className="w-full max-w-3xl">
        <header className="mb-8 text-center">
          <img
            src="/logo-glyph.svg"
            alt=""
            className="mx-auto mb-4 h-12 w-12"
            width={48}
            height={48}
          />
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            {copy.tagline}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-primary">
            {copy.newProjectTitle}
          </h1>
          <p className="mt-2 text-base text-secondary">
            {copy.newProjectSubtitle}
          </p>
        </header>

        {hasVisited ? (
          <div className="mb-8 flex flex-col items-center gap-3">
            {lastEntryPath === "import" ? (
              <Button
                type="button"
                variant="primary"
                className="min-h-12 px-6"
                disabled={isCreating}
                onClick={quickStartImport}
              >
                {copy.newProjectImportTitle}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-12 px-6"
                  disabled={isCreating}
                  onClick={() => quickStartBlank(lastCanvasSize, 1)}
                >
                  {copy.newProjectQuickStart(
                    lastCanvasSize.width,
                    lastCanvasSize.height,
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 px-6"
                  disabled={isCreating}
                  onClick={() => quickStartBlank(lastCanvasSize, 8)}
                >
                  {copy.newProjectQuickStart8(
                    lastCanvasSize.width,
                    lastCanvasSize.height,
                  )}
                </Button>
              </div>
            )}
            <button
              type="button"
              className="text-sm text-secondary underline-offset-2 hover:underline"
              onClick={() => setSelectedPath(null)}
            >
              {copy.newProjectChooseAgain}
            </button>
          </div>
        ) : null}

        {onOpenExisting ? (
          <button
            type="button"
            onClick={onOpenExisting}
            disabled={isCreating}
            className={cn(newProjectEntryCardClass(false), "mb-4 w-full")}
          >
            <FolderOpen className="h-10 w-10 text-accent" strokeWidth={1.5} />
            <span className="text-lg font-semibold text-primary">
              {copy.newProjectOpenExisting}
            </span>
            <span className="text-sm text-secondary">
              {copy.newProjectOpenExistingDescription}
            </span>
          </button>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedPath("blank")}
            className={newProjectEntryCardClass(false)}
          >
            <Pencil className="h-10 w-10 text-accent" strokeWidth={1.5} />
            <span className="text-lg font-semibold text-primary">
              {copy.newProjectBlankTitle}
            </span>
            <span className="text-sm text-secondary">
              {copy.newProjectBlankDescription}
            </span>
            <span className="text-sm text-secondary">
              {copy.newProjectBlankAnimationHint}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStartImport()}
            className={newProjectEntryCardClass(false)}
          >
            <ImagePlus className="h-10 w-10 text-accent" strokeWidth={1.5} />
            <span className="text-lg font-semibold text-primary">
              {copy.newProjectImportTitle}
            </span>
            <span className="text-sm text-secondary">
              {copy.newProjectImportDescription}
            </span>
          </button>
        </div>

        {selectedPath === "blank" ? (
          <div className="mt-8 rounded-panel border border-border bg-elevated p-6">
            <h2 className="mb-4 text-base font-semibold text-primary">
              {copy.newProjectResolutionLabel}
            </h2>
            <CanvasSizeStep value={canvasSize} onChange={setCanvasSize} />
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12"
                disabled={isCreating}
                onClick={() => quickStartBlank(canvasSize, 8)}
              >
                {copy.newProjectQuickStart8(canvasSize.width, canvasSize.height)}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="min-h-12"
                disabled={isCreating}
                onClick={() => quickStartBlank(canvasSize, 1)}
              >
                {copy.newProjectCreateBlank}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-center text-sm text-danger" role="alert">
            {error || errors.createProjectFailed}
          </p>
        ) : null}
      </div>
    </div>
  );
}
