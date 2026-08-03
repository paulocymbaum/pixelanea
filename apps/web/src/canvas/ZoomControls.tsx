import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useViewportStore } from "@/state/viewportStore";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { formatZoomPercent } from "./coordinates";

export function ZoomControls() {
  const zoom = useViewportStore((s) => s.zoom);
  const containerSize = useViewportStore((s) => s.containerSize);
  const zoomIn = useViewportStore((s) => s.zoomIn);
  const zoomOut = useViewportStore((s) => s.zoomOut);
  const fitToView = useViewportStore((s) => s.fitToView);
  const gridWidth = useEditorStore((s) => s.gridWidth);
  const gridHeight = useEditorStore((s) => s.gridHeight);

  const anchor = {
    x: containerSize.width / 2,
    y: containerSize.height / 2,
  };

  return (
    <div
      className="pointer-events-auto flex items-center gap-1 rounded-panel border border-border bg-elevated/95 p-1 shadow-sm"
      role="toolbar"
      aria-label={copy.zoomControlsLabel}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => zoomOut(anchor)}
        aria-label={copy.zoomOut}
      >
        <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      <span
        className="min-w-[3.5rem] px-1 text-center font-mono text-sm text-secondary"
        aria-live="polite"
      >
        {formatZoomPercent(zoom)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => zoomIn(anchor)}
        aria-label={copy.zoomIn}
      >
        <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fitToView(undefined, gridWidth, gridHeight)}
        aria-label={copy.zoomFit}
      >
        <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
