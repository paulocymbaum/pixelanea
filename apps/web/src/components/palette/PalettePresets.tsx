import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  useEditorStore,
  usePaletteLocked,
} from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import {
  PALETTE_PRESETS,
  type PalettePresetId,
} from "./palettePresets";

const PRESET_COPY: Record<PalettePresetId, string> = {
  retro: copy.palettePresetRetro,
  gameboy: copy.palettePresetGameboy,
  monochrome: copy.palettePresetMonochrome,
};

type PalettePresetsProps = {
  className?: string;
};

export function PalettePresets({ className }: PalettePresetsProps) {
  const locked = usePaletteLocked();
  const applyPalettePreset = useEditorStore((s) => s.applyPalettePreset);
  const lastPreset = useSessionStore((s) => s.lastPalettePreset);
  const setLastPalettePreset = useSessionStore((s) => s.setLastPalettePreset);

  const handleApply = (id: PalettePresetId, colors: readonly string[]) => {
    applyPalettePreset(colors);
    setLastPalettePreset(id);
  };

  return (
    <div className={cn("flex flex-col gap-2 border-t border-border p-3", className)}>
      <span className="text-sm font-medium text-primary">
        {copy.palettePresetsLabel}
      </span>
      <div className="flex flex-wrap gap-2">
        {PALETTE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={lastPreset === preset.id ? "primary" : "secondary"}
            size="default"
            disabled={locked}
            onClick={() => handleApply(preset.id, preset.colors)}
            className="min-h-10"
          >
            {PRESET_COPY[preset.id]}
          </Button>
        ))}
      </div>
    </div>
  );
}
