import { AnimationPlayer } from "@/components/animation/AnimationPlayer";
import { FrameThumbnail } from "@/components/frames/FrameThumbnail";
import { reorderFrames } from "@/api/frames";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  useActiveFrameIndex,
  useEditorStore,
  useFrameCount,
  useFramePixelsByIndex,
  useIsPlaying,
  usePaletteColors,
} from "@/state/editorStore";
import { activeIndexAfterReorder } from "@/state/frameReorder";

export function BottomFrameStrip() {
  const frameCount = useFrameCount();
  const activeFrameIndex = useActiveFrameIndex();
  const framePixelsByIndex = useFramePixelsByIndex();
  const isPlaying = useIsPlaying();
  const paletteColors = usePaletteColors();
  const projectId = useEditorStore((s) => s.projectId);
  const gridWidth = useEditorStore((s) => s.gridWidth);
  const gridHeight = useEditorStore((s) => s.gridHeight);
  const switchFrame = useEditorStore((s) => s.switchFrame);
  const reloadAllFrames = useEditorStore((s) => s.reloadAllFrames);
  const setSyncStatus = useEditorStore((s) => s.setSyncStatus);

  if (frameCount <= 1) {
    return null;
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!projectId || isPlaying || fromIndex === toIndex) {
      return;
    }

    const result = await reorderFrames(projectId, {
      fromIndex,
      toIndex,
    });

    if (!result.ok) {
      setSyncStatus("error", result.message);
      return;
    }

    const nextActive = activeIndexAfterReorder(
      activeFrameIndex,
      fromIndex,
      toIndex,
    );
    await reloadAllFrames(frameCount, nextActive);
  };

  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center gap-4 border-t border-border bg-surface px-4",
        isPlaying && "opacity-95",
      )}
      aria-label={copy.frameStripLabel}
    >
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        {Array.from({ length: frameCount }, (_, index) => (
          <FrameThumbnail
            key={index}
            index={index}
            frameCount={frameCount}
            pixels={framePixelsByIndex[index]}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            paletteColors={paletteColors}
            isActive={index === activeFrameIndex}
            isPlaying={isPlaying}
            draggable
            onReorder={(from, to) => void handleReorder(from, to)}
            onSelect={(frameIndex) => {
              void switchFrame(frameIndex);
            }}
          />
        ))}
      </div>

      <AnimationPlayer className="shrink-0" />
    </div>
  );
}
