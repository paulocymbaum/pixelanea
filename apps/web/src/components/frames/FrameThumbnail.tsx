import { useEffect, useRef, type DragEvent } from "react";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { cn } from "@/lib/cn";
import { copy } from "@/content/copy";
import { FrameThumbnailMenu } from "./FrameThumbnailMenu";

const THUMB_SIZE = 40;

type FrameThumbnailProps = {
  index: number;
  frameCount: number;
  pixels?: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  isActive: boolean;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  draggable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
};

export function FrameThumbnail({
  index,
  frameCount,
  pixels,
  gridWidth,
  gridHeight,
  paletteColors,
  isActive,
  isPlaying,
  onSelect,
  draggable = false,
  onReorder,
}: FrameThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canDrag = Boolean(draggable && !isPlaying && onReorder);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const imageData = ctx.createImageData(gridWidth, gridHeight);
    const data = imageData.data;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const paletteIndex = pixels[y * gridWidth + x] ?? TRANSPARENT_INDEX;
        const offset = (y * gridWidth + x) * 4;

        if (paletteIndex === TRANSPARENT_INDEX) {
          data[offset] = 204;
          data[offset + 1] = 204;
          data[offset + 2] = 204;
          data[offset + 3] = 255;
          continue;
        }

        const hex =
          paletteColors[paletteIndex] ?? DEFAULT_PALETTE_COLORS[0] ?? "#000000";
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
      }
    }

    canvas.width = gridWidth;
    canvas.height = gridHeight;
    ctx.putImageData(imageData, 0, 0);
  }, [pixels, gridWidth, gridHeight, paletteColors]);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (!canDrag) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (!canDrag) {
      return;
    }
    event.preventDefault();
    const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (Number.isNaN(fromIndex) || fromIndex === index) {
      return;
    }
    onReorder?.(fromIndex, index);
  };

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={() => onSelect(index)}
        disabled={isPlaying}
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-label={copy.frameThumbnail(index)}
        aria-current={isActive ? "true" : undefined}
        title={canDrag ? copy.frameReorderDragHint : undefined}
        className={cn(
          "flex h-10 w-10 items-center justify-center overflow-hidden rounded-swatch border-2 bg-elevated transition-opacity",
          isActive
            ? "border-accent ring-2 ring-accent/30"
            : "border-border hover:border-accent/50",
          isPlaying && !isActive && "opacity-50",
          canDrag && "cursor-grab active:cursor-grabbing",
        )}
      >
        {pixels ? (
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{
              imageRendering: "pixelated",
              width: THUMB_SIZE,
              height: THUMB_SIZE,
            }}
          />
        ) : (
          <span className="font-mono text-xs text-secondary">{index + 1}</span>
        )}
      </button>

      {frameCount > 1 ? (
        <FrameThumbnailMenu
          frameIndex={index}
          frameCount={frameCount}
          disabled={isPlaying}
        />
      ) : null}
    </div>
  );
}
