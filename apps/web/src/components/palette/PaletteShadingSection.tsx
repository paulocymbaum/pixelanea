import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { PALETTE_MAX_COLORS } from "@/state/paletteUtils";
import {
  useActiveColorIndex,
  useEditorStore,
  usePaletteColors,
  usePaletteLocked,
} from "@/state/editorStore";
import { ShadingPalettePicker } from "./ShadingPalettePicker";

type PaletteShadingSectionProps = {
  className?: string;
};

export function PaletteShadingSection({ className }: PaletteShadingSectionProps) {
  const colors = usePaletteColors();
  const activeIndex = useActiveColorIndex();
  const locked = usePaletteLocked();
  const addPaletteColor = useEditorStore((s) => s.addPaletteColor);
  const updatePaletteColor = useEditorStore((s) => s.updatePaletteColor);

  const baseColor = colors[activeIndex] ?? copy.paletteDefaultNewColor;

  const handleSelectShade = (hex: string) => {
    if (locked) {
      return;
    }

    if (colors.length < PALETTE_MAX_COLORS) {
      addPaletteColor(hex);
      return;
    }

    updatePaletteColor(activeIndex, hex);
  };

  return (
    <ShadingPalettePicker
      className={cn("border-t border-border p-3", className)}
      baseColor={baseColor}
      onSelectShade={handleSelectShade}
      disabled={locked}
    />
  );
}
