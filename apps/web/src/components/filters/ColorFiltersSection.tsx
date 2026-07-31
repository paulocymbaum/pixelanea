import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  hasActiveColorFilters,
  LIGHTING_INTENSITY_MAX,
  LIGHTING_INTENSITY_MIN,
  LIGHTING_RADIUS_MAX,
  LIGHTING_RADIUS_MIN,
} from "@/lib/colorFilters";
import {
  useColorFilters,
  useEditorStore,
  usePlacingLighting,
  useReadOnly,
} from "@/state/editorStore";

type ColorFiltersSectionProps = {
  className?: string;
};

export function ColorFiltersSection({ className }: ColorFiltersSectionProps) {
  const readOnly = useReadOnly();
  const colorFilters = useColorFilters();
  const placingLighting = usePlacingLighting();
  const setOverlayEnabled = useEditorStore((s) => s.setColorFilterOverlayEnabled);
  const setOverlayColor = useEditorStore((s) => s.setColorFilterOverlayColor);
  const setOverlayOpacity = useEditorStore((s) => s.setColorFilterOverlayOpacity);
  const removeLightingPoint = useEditorStore((s) => s.removeColorFilterLightingPoint);
  const updateLightingPoint = useEditorStore(
    (s) => s.updateColorFilterLightingPoint,
  );
  const setPlacingLighting = useEditorStore((s) => s.setPlacingLighting);
  const resetColorFilters = useEditorStore((s) => s.resetColorFilters);
  const applyColorFilters = useEditorStore((s) => s.applyColorFilters);

  const disabled = readOnly;
  const canApply = hasActiveColorFilters(colorFilters);

  return (
    <section
      className={cn("flex flex-col gap-3 border-t border-border p-3", className)}
      aria-label={copy.colorFiltersSectionLabel}
    >
      <span className="text-sm font-medium text-primary">
        {copy.colorFiltersSectionLabel}
      </span>
      <p className="text-sm text-secondary">{copy.colorFiltersApplyHint}</p>

      <label className="flex items-center gap-2 text-sm text-primary">
        <input
          type="checkbox"
          checked={colorFilters.overlayEnabled}
          disabled={disabled}
          onChange={(event) => setOverlayEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-border accent-accent"
        />
        {copy.colorFiltersOverlayEnabled}
      </label>

      {colorFilters.overlayEnabled ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-md border-2 border-border"
              style={{ backgroundColor: colorFilters.overlayColor }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={colorFilters.overlayColor}
              disabled={disabled}
              onChange={(event) => setOverlayColor(event.target.value)}
              className="h-10 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-surface p-1 disabled:opacity-50"
              aria-label={copy.colorFiltersOverlayColorLabel}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm text-primary">
              <span>{copy.colorFiltersOverlayOpacityLabel}</span>
              <span className="text-secondary">
                {copy.colorFiltersOverlayOpacityValue(
                  Math.round(colorFilters.overlayOpacity * 100),
                )}
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              value={[Math.round(colorFilters.overlayOpacity * 100)]}
              onValueChange={([value]) =>
                setOverlayOpacity((value ?? 0) / 100)
              }
              aria-label={copy.colorFiltersOverlayOpacityLabel}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">
          {copy.colorFiltersLightingLabel}
        </span>
        <Button
          type="button"
          variant={placingLighting ? "primary" : "secondary"}
          disabled={disabled}
          aria-pressed={placingLighting}
          onClick={() => setPlacingLighting(!placingLighting)}
          className="w-full"
        >
          {placingLighting
            ? copy.colorFiltersPlaceLightingOn
            : copy.colorFiltersPlaceLighting}
        </Button>
      </div>

      {colorFilters.lightingPoints.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {colorFilters.lightingPoints.map((point, index) => (
            <li
              key={point.id}
              className="flex flex-col gap-2 rounded-md border border-border p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-primary">
                  {copy.colorFiltersLightingPointLabel(index)} ({point.x},{" "}
                  {point.y})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  disabled={disabled}
                  onClick={() => removeLightingPoint(point.id)}
                  className="min-h-8 px-2 text-sm"
                >
                  {copy.colorFiltersRemoveLighting}
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm text-primary">
                  <span>{copy.colorFiltersLightingRadiusLabel}</span>
                  <span className="text-secondary">{point.radius}</span>
                </div>
                <Slider
                  min={LIGHTING_RADIUS_MIN}
                  max={LIGHTING_RADIUS_MAX}
                  step={1}
                  disabled={disabled}
                  value={[point.radius]}
                  onValueChange={([value]) =>
                    updateLightingPoint(point.id, { radius: value ?? point.radius })
                  }
                  aria-label={copy.colorFiltersLightingRadiusLabel}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm text-primary">
                  <span>{copy.colorFiltersLightingIntensityLabel}</span>
                  <span className="text-secondary">
                    {Math.round(point.intensity * 100)}%
                  </span>
                </div>
                <Slider
                  min={LIGHTING_INTENSITY_MIN * 100}
                  max={LIGHTING_INTENSITY_MAX * 100}
                  step={5}
                  disabled={disabled}
                  value={[Math.round(point.intensity * 100)]}
                  onValueChange={([value]) =>
                    updateLightingPoint(point.id, {
                      intensity: (value ?? 0) / 100,
                    })
                  }
                  aria-label={copy.colorFiltersLightingIntensityLabel}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={disabled || !canApply}
          onClick={() => applyColorFilters()}
          className="w-full"
        >
          {copy.colorFiltersApply}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => resetColorFilters()}
          className="w-full"
        >
          {copy.colorFiltersReset}
        </Button>
      </div>
    </section>
  );
}
