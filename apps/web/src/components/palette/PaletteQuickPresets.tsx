import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/state/sessionStore";
import {
  getQuickPalettePresets,
  palettePresetLabel,
  type PalettePreset,
} from "./palettePresetCatalog";
import { usePalettePresetApply } from "./usePalettePresetApply";

type PaletteQuickPresetsProps = {
  className?: string;
};

export function PaletteQuickPresets({ className }: PaletteQuickPresetsProps) {
  const {
    applyPreset,
    applySourcePalette,
    hasSourcePalette,
    locked,
    lastPreset,
  } = usePalettePresetApply();
  const setPalettePanelSection = useSessionStore((s) => s.setPalettePanelSection);
  const quickPresets = getQuickPalettePresets(lastPreset);

  const handleSelect = (preset: PalettePreset) => {
    applyPreset(preset.id, preset.colors);
  };

  return (
    <div
      className={cn("flex flex-col gap-2 border-t border-border px-3 py-2", className)}
      aria-label={copy.paletteQuickPresetsLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-primary">
          {copy.paletteQuickPresetsLabel}
        </span>
        <button
          type="button"
          className="shrink-0 text-sm text-secondary underline-offset-2 hover:underline"
          onClick={() => setPalettePanelSection("presets")}
        >
          {copy.paletteQuickPresetsSeeAll}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 pb-1">
        {hasSourcePalette ? (
          <Button
            type="button"
            variant={lastPreset === "source" ? "primary" : "secondary"}
            disabled={locked}
            onClick={applySourcePalette}
            className="h-8 min-h-8 shrink-0 px-2 text-sm"
            aria-pressed={lastPreset === "source"}
          >
            {copy.palettePresetSource}
          </Button>
        ) : null}
        {quickPresets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={lastPreset === preset.id ? "primary" : "secondary"}
            disabled={locked}
            onClick={() => handleSelect(preset)}
            className="h-8 min-h-8 shrink-0 px-2 text-sm"
            aria-pressed={lastPreset === preset.id}
          >
            {palettePresetLabel(preset.id)}
          </Button>
        ))}
      </div>
    </div>
  );
}
