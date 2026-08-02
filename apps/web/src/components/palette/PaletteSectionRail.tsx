import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toolButtonVariants,
} from "@/components/ui";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  type PalettePanelSection,
  usePalettePanelSection,
  useUiStore,
} from "@/state/uiStore";
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
  const setPalettePanelSection = useUiStore((s) => s.setPalettePanelSection);

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
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleSelect(id)}
                className={cn(
                  toolButtonVariants({ active: isActive }),
                  "w-10 shrink-0 rounded-none px-0 py-2",
                )}
                aria-label={label}
                aria-current={isActive ? "true" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
