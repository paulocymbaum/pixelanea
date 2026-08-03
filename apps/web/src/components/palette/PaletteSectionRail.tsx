import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toolButtonVariants,
} from "@/components/ui";
import { copy } from "@/content/copy";
import { hasActiveColorFilters } from "@/lib/colorFilters";
import { cn } from "@/lib/cn";
import { useColorFilters } from "@/state/editorStore";
import {
  type PalettePanelSection,
  usePalettePanelSection,
  useSessionStore,
} from "@/state/sessionStore";
import { usePaletteMoreToolsExpanded, useUiStore } from "@/state/uiStore";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Palette,
  Sparkles,
  Sun,
} from "lucide-react";

const PRIMARY_SECTIONS: {
  id: PalettePanelSection;
  icon: typeof Palette;
  label: string;
  shortLabel: string;
}[] = [
  {
    id: "swatches",
    icon: Palette,
    label: copy.palettePanelSectionSwatches,
    shortLabel: copy.palettePanelSectionSwatchesShort,
  },
  {
    id: "presets",
    icon: LayoutGrid,
    label: copy.palettePanelSectionPresets,
    shortLabel: copy.palettePanelSectionPresetsShort,
  },
];

const MORE_SECTIONS: {
  id: PalettePanelSection;
  icon: typeof Palette;
  label: string;
  shortLabel: string;
}[] = [
  {
    id: "shading",
    icon: Sun,
    label: copy.palettePanelSectionShading,
    shortLabel: copy.palettePanelSectionShadingShort,
  },
  {
    id: "filters",
    icon: Sparkles,
    label: copy.palettePanelSectionFilters,
    shortLabel: copy.palettePanelSectionFiltersShort,
  },
];

type PaletteSectionRailProps = {
  className?: string;
  onSectionSelect?: (section: PalettePanelSection) => void;
};

export function PaletteSectionRail({
  className,
  onSectionSelect,
}: PaletteSectionRailProps) {
  const activeSection = usePalettePanelSection();
  const setPalettePanelSection = useSessionStore(
    (s) => s.setPalettePanelSection,
  );
  const colorFilters = useColorFilters();
  const filtersActive = hasActiveColorFilters(colorFilters);
  const moreToolsExpanded = usePaletteMoreToolsExpanded();
  const setPaletteMoreToolsExpanded = useUiStore(
    (s) => s.setPaletteMoreToolsExpanded,
  );

  const showMoreSections =
    moreToolsExpanded ||
    activeSection === "shading" ||
    activeSection === "filters";

  const handleSelect = (section: PalettePanelSection) => {
    if (section === "shading" || section === "filters") {
      setPaletteMoreToolsExpanded(true);
    }
    setPalettePanelSection(section);
    onSectionSelect?.(section);
  };

  const toggleMoreTools = () => {
    setPaletteMoreToolsExpanded(!moreToolsExpanded);
  };

  const renderSectionButton = ({
    id,
    icon: Icon,
    label,
    shortLabel,
  }: {
    id: PalettePanelSection;
    icon: typeof Palette;
    label: string;
    shortLabel: string;
  }) => {
    const isActive = activeSection === id;
    const showFilterBadge = id === "filters" && filtersActive;
    const accessibleLabel =
      showFilterBadge ? copy.palettePanelSectionFiltersActive : label;

    return (
      <Tooltip key={id}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => handleSelect(id)}
            className={cn(
              toolButtonVariants({ active: isActive }),
              "relative w-10 shrink-0 rounded-none px-0 py-2 lg:w-16 lg:px-1",
            )}
            aria-label={accessibleLabel}
            aria-current={isActive ? "true" : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            <span className="hidden text-center text-[10px] leading-tight lg:block">
              {shortLabel}
            </span>
            {showFilterBadge ? (
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent lg:right-2"
                aria-hidden
                data-testid="filter-active-badge"
              />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="lg:hidden">
          {accessibleLabel}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav
      className={cn(
        "flex w-10 shrink-0 flex-col border-r border-border bg-surface lg:w-16",
        className,
      )}
      aria-label="Palette sections"
    >
      {PRIMARY_SECTIONS.map(renderSectionButton)}

      {showMoreSections ? MORE_SECTIONS.map(renderSectionButton) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleMoreTools}
            className={cn(
              toolButtonVariants({ active: false }),
              "mt-auto w-10 shrink-0 rounded-none px-0 py-2 text-secondary lg:w-16 lg:px-1",
            )}
            aria-expanded={moreToolsExpanded}
            aria-label={
              moreToolsExpanded
                ? copy.paletteMoreToolsCollapse
                : copy.paletteMoreToolsExpand
            }
          >
            {moreToolsExpanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            )}
            <span className="hidden text-center text-[10px] leading-tight lg:block">
              {copy.paletteMoreToolsSummary}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="lg:hidden">
          {moreToolsExpanded
            ? copy.paletteMoreToolsCollapse
            : copy.paletteMoreToolsExpand}
        </TooltipContent>
      </Tooltip>
    </nav>
  );
}
