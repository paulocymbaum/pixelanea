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
import { LayoutGrid, Palette, Sparkles, Sun } from "lucide-react";

const SECTIONS: {
  id: PalettePanelSection;
  icon: typeof Palette;
  label: string;
}[] = [
  { id: "swatches", icon: Palette, label: copy.palettePanelSectionSwatches },
  { id: "presets", icon: LayoutGrid, label: copy.palettePanelSectionPresets },
  { id: "shading", icon: Sun, label: copy.palettePanelSectionShading },
  { id: "filters", icon: Sparkles, label: copy.palettePanelSectionFilters },
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

  const handleSelect = (section: PalettePanelSection) => {
    setPalettePanelSection(section);
    onSectionSelect?.(section);
  };

  return (
    <nav
      className={cn(
        "flex w-10 shrink-0 flex-col border-r border-border bg-surface",
        className,
      )}
      aria-label="Palette sections"
    >
      {SECTIONS.map(({ id, icon: Icon, label }) => {
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
                  "relative w-10 shrink-0 rounded-none px-0 py-2",
                )}
                aria-label={accessibleLabel}
                aria-current={isActive ? "true" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                {showFilterBadge ? (
                  <span
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
                    aria-hidden
                    data-testid="filter-active-badge"
                  />
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{accessibleLabel}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
