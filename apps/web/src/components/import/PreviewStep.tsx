import { copy } from "@/content/copy";
import { PixelPreviewCanvas } from "./PixelPreviewCanvas";

type PreviewStepProps = {
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  isLoading: boolean;
  error: string | null;
};

export function PreviewStep({
  pixels,
  gridWidth,
  gridHeight,
  paletteColors,
  isLoading,
  error,
}: PreviewStepProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="self-start text-sm text-secondary">
        {copy.importWizardPreviewHint}
      </p>
      {isLoading ? (
        <p className="text-base text-secondary" aria-live="polite">
          {copy.importWizardLoading}
        </p>
      ) : (
        <PixelPreviewCanvas
          pixels={pixels}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          paletteColors={paletteColors}
        />
      )}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
