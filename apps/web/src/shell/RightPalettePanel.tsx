import { ColorFiltersSection } from "@/components/filters/ColorFiltersSection";
import { PaletteActions } from "@/components/palette/PaletteActions";
import { PaletteLock } from "@/components/palette/PaletteLock";
import { PalettePresets } from "@/components/palette/PalettePresets";
import { PaletteQuickPresets } from "@/components/palette/PaletteQuickPresets";
import { PaletteSectionRail } from "@/components/palette/PaletteSectionRail";
import { PaletteShadingSection } from "@/components/palette/PaletteShadingSection";
import { PaletteSwatchGrid } from "@/components/palette/PaletteSwatchGrid";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import {
  type PalettePanelSection,
  usePalettePanelSection,
  useSessionStore,
} from "@/state/sessionStore";
import { usePaletteCollapsed, useUiStore } from "@/state/uiStore";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PaletteSectionContent({ section }: { section: PalettePanelSection }) {
  switch (section) {
    case "swatches":
      return (
        <>
          <PaletteSwatchGrid />
          <PaletteQuickPresets />
          <PaletteActions />
        </>
      );
    case "presets":
      return <PalettePresets className="border-t-0" />;
    case "shading":
      return <PaletteShadingSection className="border-t-0" />;
    case "filters":
      return <ColorFiltersSection className="border-t-0" />;
  }
}

export function RightPalettePanel() {
  const collapsed = usePaletteCollapsed();
  const activeSection = usePalettePanelSection();
  const setPaletteCollapsed = useUiStore((s) => s.setPaletteCollapsed);
  const width = useSessionStore((s) => s.palettePanelWidth);
  const projectId = useEditorStore((s) => s.projectId);

  const toggle = () => setPaletteCollapsed(!collapsed);

  const handleCollapsedSectionSelect = () => {
    setPaletteCollapsed(false);
  };

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col border-l border-border bg-surface">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Expand palette panel"
          className="m-1 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </Button>
        <PaletteSectionRail
          className="border-r-0"
          onSectionSelect={handleCollapsedSectionSelect}
        />
      </div>
    );
  }

  return (
    <aside
      className="transition-panel flex shrink-0 flex-col border-l border-border bg-surface"
      style={{ width }}
      aria-label="Palette"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-md font-medium text-primary">Palette</h2>
        <div className="flex items-center gap-2">
          {projectId ? <PaletteLock /> : null}
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
      </div>
      {projectId ? (
        <div className="flex min-h-0 flex-1">
          <PaletteSectionRail />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PaletteSectionContent section={activeSection} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-secondary">
          {copy.palettePlaceholder}
        </div>
      )}
    </aside>
  );
}
