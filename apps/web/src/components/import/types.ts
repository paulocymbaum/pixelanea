import type { PalettePresetId } from "@/components/palette/palettePresetCatalog";
import type { ResolutionPreset } from "./resolutionPresets";

export type ImportWizardStep = "file" | "resolution" | "palette" | "preview";

export type ImportWizardState = {
  step: ImportWizardStep;
  file: File | null;
  imageData: string | null;
  resolution: ResolutionPreset;
  palettePreset: PalettePresetId;
  projectId: string | null;
  previewPixels: Uint8Array | null;
  previewPalette: readonly string[];
  previewWidth: number;
  previewHeight: number;
  error: string | null;
  isLoading: boolean;
};

export const IMPORT_WIZARD_STEPS: readonly ImportWizardStep[] = [
  "file",
  "resolution",
  "palette",
  "preview",
] as const;

export function stepIndex(step: ImportWizardStep): number {
  return IMPORT_WIZARD_STEPS.indexOf(step);
}
