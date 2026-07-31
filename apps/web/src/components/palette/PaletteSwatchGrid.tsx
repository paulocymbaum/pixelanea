import { cn } from "@/lib/cn";
import { useActiveColorIndex, usePaletteColors } from "@/state/editorStore";
import { useEditorStore } from "@/state/editorStore";

type PaletteSwatchGridProps = {
  className?: string;
};

export function PaletteSwatchGrid({ className }: PaletteSwatchGridProps) {
  const colors = usePaletteColors();
  const activeIndex = useActiveColorIndex();
  const setActiveColorIndex = useEditorStore((s) => s.setActiveColorIndex);

  return (
    <div
      className={cn("grid grid-cols-3 gap-2 p-3", className)}
      role="listbox"
      aria-label="Palette colors"
    >
      {colors.map((hex, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={`${index}-${hex}`}
            type="button"
            role="option"
            aria-selected={isActive}
            aria-label={`Color ${index + 1}`}
            title={`Color ${index + 1}`}
            onClick={() => setActiveColorIndex(index)}
            className={cn(
              "aspect-square rounded-md border-2 transition-colors",
              isActive
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/50",
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
