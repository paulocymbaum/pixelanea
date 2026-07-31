import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  ANIMATION_FRAME_PRESETS,
  type AnimationFramePreset,
} from "@/components/project/animationFramePresets";
import { duplicateFrames } from "@/api/frames";
import { copy } from "@/content/copy";
import { useActiveFrameIndex, useEditorStore } from "@/state/editorStore";

type FillMode = "copy" | "blank";

type FrameDuplicateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FrameDuplicateDialog({
  open,
  onOpenChange,
}: FrameDuplicateDialogProps) {
  const projectId = useEditorStore((s) => s.projectId);
  const activeFrameIndex = useActiveFrameIndex();
  const reloadAllFrames = useEditorStore((s) => s.reloadAllFrames);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const [frameCount, setFrameCount] = useState<AnimationFramePreset>(8);
  const [fillMode, setFillMode] = useState<FillMode>("copy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!projectId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await duplicateFrames(projectId, {
      frameCount,
      sourceFrameIndex: activeFrameIndex,
      fillMode,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    const reload = await reloadAllFrames(
      result.response.project.frameCount,
      activeFrameIndex,
    );

    setIsSubmitting(false);

    if (!reload.ok) {
      setError(useEditorStore.getState().syncError ?? copy.projectOpening);
      return;
    }

    setActiveTool("paint");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.frameDuplicateTitle}</DialogTitle>
          <DialogDescription>{copy.frameDuplicateDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {ANIMATION_FRAME_PRESETS.map((count) => (
              <Button
                key={count}
                type="button"
                variant={frameCount === count ? "primary" : "secondary"}
                className="min-h-12"
                onClick={() => setFrameCount(count)}
                aria-pressed={frameCount === count}
                disabled={isSubmitting}
              >
                {copy.newProjectAnimationFrames(count)}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={fillMode === "copy" ? "primary" : "secondary"}
              className="flex h-auto min-h-16 flex-col items-start gap-1 px-4 py-3"
              onClick={() => setFillMode("copy")}
              aria-pressed={fillMode === "copy"}
              disabled={isSubmitting}
            >
              <span className="font-semibold">{copy.frameDuplicateFillCopy}</span>
              <span className="text-sm opacity-80">
                {copy.frameDuplicateFillCopyHint}
              </span>
            </Button>
            <Button
              type="button"
              variant={fillMode === "blank" ? "primary" : "secondary"}
              className="flex h-auto min-h-16 flex-col items-start gap-1 px-4 py-3"
              onClick={() => setFillMode("blank")}
              aria-pressed={fillMode === "blank"}
              disabled={isSubmitting}
            >
              <span className="font-semibold">{copy.frameDuplicateFillBlank}</span>
              <span className="text-sm opacity-80">
                {copy.frameDuplicateFillBlankHint}
              </span>
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {copy.projectCancel}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || !projectId}
          >
            {copy.frameDuplicateConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
