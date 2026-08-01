import { ColorFiltersSection } from "@/components/filters/ColorFiltersSection";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { PaletteShadingSection } from "./PaletteShadingSection";

type PaletteMoreToolsSectionProps = {
  className?: string;
};

export function PaletteMoreToolsSection({ className }: PaletteMoreToolsSectionProps) {
  return (
    <details className={cn("border-t border-border", className)}>
      <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-primary">
        {copy.paletteMoreToolsSummary}
      </summary>
      <div className="flex flex-col">
        <PaletteShadingSection className="border-t-0 pt-0" />
        <ColorFiltersSection />
      </div>
    </details>
  );
}
