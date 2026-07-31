import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { copyFrame, fetchFrame, pixelsFromFrame } from "@/api/frames";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";

type FrameThumbnailMenuProps = {
  frameIndex: number;
  frameCount: number;
  disabled?: boolean;
};

export function FrameThumbnailMenu({
  frameIndex,
  frameCount,
  disabled = false,
}: FrameThumbnailMenuProps) {
  const projectId = useEditorStore((s) => s.projectId);
  const framePixelsByIndex = useEditorStore((s) => s.framePixelsByIndex);
  const applyFramePixelsAtIndex = useEditorStore((s) => s.applyFramePixelsAtIndex);
  const setSyncStatus = useEditorStore((s) => s.setSyncStatus);

  const handleCopyFrom = async (sourceIndex: number) => {
    if (!projectId || sourceIndex === frameIndex) {
      return;
    }

    const result = await copyFrame(projectId, {
      sourceFrameIndex: sourceIndex,
      targetFrameIndex: frameIndex,
    });

    if (!result.ok) {
      setSyncStatus("error", result.message);
      return;
    }

    const cached = framePixelsByIndex[sourceIndex];
    if (cached) {
      applyFramePixelsAtIndex(frameIndex, cached);
      return;
    }

    const fetched = await fetchFrame(projectId, frameIndex);
    if (!fetched.ok) {
      setSyncStatus("error", fetched.message);
      return;
    }

    applyFramePixelsAtIndex(frameIndex, pixelsFromFrame(fetched.frame));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute -right-1 -top-1 h-5 w-5 min-h-0 rounded-full bg-elevated p-0 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={copy.frameCopyFromMenu}
          disabled={disabled}
        >
          <MoreHorizontal className="h-3 w-3" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Array.from({ length: frameCount }, (_, sourceIndex) => {
          if (sourceIndex === frameIndex) {
            return null;
          }

          return (
            <DropdownMenuItem
              key={sourceIndex}
              onSelect={() => void handleCopyFrom(sourceIndex)}
            >
              {copy.frameCopyFromOption(sourceIndex)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
