import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  SHADING_STYLES,
  generateShadingPalette,
  type ShadingStyle,
} from "@/lib/shadingPalettes";
import { useMemo, useState } from "react";

const STYLE_COPY: Record<ShadingStyle, string> = {
  "cell-shading": copy.paletteShadingStyleCellShading,
  lighting: copy.paletteShadingStyleLighting,
  dark: copy.paletteShadingStyleDark,
};

type ShadingPalettePickerProps = {
  baseColor: string;
  onSelectShade: (hex: string) => void;
  className?: string;
  disabled?: boolean;
};

export function ShadingPalettePicker({
  baseColor,
  onSelectShade,
  className,
  disabled = false,
}: ShadingPalettePickerProps) {
  const [activeStyle, setActiveStyle] = useState<ShadingStyle>("lighting");

  const shades = useMemo(
    () => generateShadingPalette(baseColor, activeStyle),
    [baseColor, activeStyle],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <span className="text-sm font-medium text-primary">
        {copy.paletteShadingSectionLabel}
      </span>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={copy.paletteShadingStylesLabel}
      >
        {SHADING_STYLES.map((style) => {
          const isActive = style === activeStyle;
          return (
            <Button
              key={style}
              type="button"
              role="tab"
              aria-selected={isActive}
              variant={isActive ? "primary" : "secondary"}
              size="default"
              disabled={disabled}
              onClick={() => setActiveStyle(style)}
              className="min-h-10"
            >
              {STYLE_COPY[style]}
            </Button>
          );
        })}
      </div>

      {shades.length > 0 ? (
        <div
          className="grid grid-cols-5 gap-2"
          role="listbox"
          aria-label={copy.paletteShadingShadesLabel}
        >
          {shades.map((hex, index) => (
            <button
              key={`${activeStyle}-${hex}-${index}`}
              type="button"
              role="option"
              disabled={disabled}
              aria-label={copy.paletteShadingShadeLabel(index + 1, hex)}
              title={hex}
              onClick={() => onSelectShade(hex)}
              className={cn(
                "aspect-square min-h-10 rounded-md border-2 border-border transition-colors",
                "hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-secondary">{copy.paletteShadingInvalidColor}</p>
      )}
    </div>
  );
}
