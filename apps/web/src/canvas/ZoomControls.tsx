import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { formatZoomPercent } from "./coordinates";

export function ZoomControls() {
  const zoom = useEditorStore((s) => s.zoom);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const fitToView = useEditorStore((s) => s.fitToView);

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
        onClick={() => zoomOut()}
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
        onClick={() => zoomIn()}
        aria-label={copy.zoomIn}
      >
        <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fitToView()}
        aria-label={copy.zoomFit}
      >
        <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
