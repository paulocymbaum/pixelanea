import { PaletteActions } from "@/components/palette/PaletteActions";
import { PaletteSwatchGrid } from "@/components/palette/PaletteSwatchGrid";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { usePaletteCollapsed, useUiStore } from "@/state/uiStore";
import { useSessionStore } from "@/state/sessionStore";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RightPalettePanel() {
  const collapsed = usePaletteCollapsed();
  const setPaletteCollapsed = useUiStore((s) => s.setPaletteCollapsed);
  const width = useSessionStore((s) => s.palettePanelWidth);
  const projectId = useEditorStore((s) => s.projectId);

  const toggle = () => setPaletteCollapsed(!collapsed);

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col border-l border-border bg-surface">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Expand palette panel"
          className="m-1"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className="transition-panel flex shrink-0 flex-col border-l border-border bg-surface"
      style={{ width }}
      aria-label="Palette"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-md font-medium text-primary">Palette</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Collapse palette panel"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {projectId ? (
          <>
            <PaletteSwatchGrid />
            <PaletteActions />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4 text-secondary">
            {copy.palettePlaceholder}
          </div>
        )}
      </div>
    </aside>
  );
}
