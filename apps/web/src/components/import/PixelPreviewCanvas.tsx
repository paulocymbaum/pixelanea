import { useEffect, useRef } from "react";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { cn } from "@/lib/cn";

type PixelPreviewCanvasProps = {
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  className?: string;
  label?: string;
};

export function PixelPreviewCanvas({
  pixels,
  gridWidth,
  gridHeight,
  paletteColors,
  className,
  label = "Import preview",
}: PixelPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
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
          const checker = (x + y) % 2 === 0;
          data[offset] = checker ? 204 : 255;
          data[offset + 1] = checker ? 204 : 255;
          data[offset + 2] = checker ? 204 : 255;
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

  const scale = Math.min(320 / gridWidth, 320 / gridHeight, 32);

  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      className={cn("rounded-panel border border-border bg-canvas", className)}
      style={{
        imageRendering: "pixelated",
        width: gridWidth * scale,
        height: gridHeight * scale,
      }}
    />
  );
}
