import { useCallback, useEffect, useRef, useState } from "react";
import { pixelateImage } from "@/api/import";
import { closeProjectSession, createBlankProject } from "@/api/projects";
import { errorDetail, logger } from "@/logging/logger";
import {
  fetchPalette,
  paletteColorsFromApi,
  paletteColorsFromPresetSlots,
  saveImportPalette,
} from "@/api/palette";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { loadProjectIntoEditor } from "@/lib/loadProject";
import { useSessionStore } from "@/state/sessionStore";
import { getPalettePreset } from "@/components/palette/palettePresets";
import { FileDropStep } from "./FileDropStep";
import { isAcceptedImageType } from "./fileUtils";
import { fileToBase64 } from "./fileUtils";
import { ImportStepIndicator } from "./ImportStepIndicator";
import { PaletteStep } from "./PaletteStep";
import {
  clampImportColorCount,
  type ImportColorCount,
  type ImportPaletteMode,
} from "./paletteImportOptions";
import type { ResolutionPreset } from "./resolutionPresets";
import { PreviewStep } from "./PreviewStep";
import { ResolutionStep } from "./ResolutionStep";
import type { ImportWizardStep } from "./types";
import { IMPORT_WIZARD_STEPS } from "./types";

type PixelateWizardProps = {
  onComplete: () => void;
  onBack: () => void;
};

const DEFAULT_PROJECT = {
  name: "Imported project",
  frameCount: 1,
  fps: 8,
  cellSize: 16,
  loop: true,
} as const;

export function PixelateWizard({ onComplete, onBack }: PixelateWizardProps) {
  const lastResolution = useSessionStore((s) => s.lastResolution);
  const lastPalettePreset = useSessionStore((s) => s.lastPalettePreset);
  const lastImportPaletteMode = useSessionStore((s) => s.lastImportPaletteMode);
  const lastImportColorCount = useSessionStore((s) => s.lastImportColorCount);
  const removeBackground = useSessionStore((s) => s.removeBackground);
  const setLastResolution = useSessionStore((s) => s.setLastResolution);
  const setLastPalettePreset = useSessionStore((s) => s.setLastPalettePreset);
  const setLastImportPaletteMode = useSessionStore((s) => s.setLastImportPaletteMode);
  const setLastImportColorCount = useSessionStore((s) => s.setLastImportColorCount);
  const setRemoveBackground = useSessionStore((s) => s.setRemoveBackground);
  const setHasVisited = useSessionStore((s) => s.setHasVisited);
  const setLastEntryPath = useSessionStore((s) => s.setLastEntryPath);

  const [step, setStep] = useState<ImportWizardStep>("file");
  const [file, setFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [resolution, setResolution] = useState(lastResolution);
  const [palettePreset, setPalettePreset] = useState(
    lastPalettePreset ?? "retro",
  );
  const [paletteMode, setPaletteMode] = useState<ImportPaletteMode>(
    lastImportPaletteMode,
  );
  const [paletteColorCount, setPaletteColorCount] = useState<ImportColorCount>(
    lastImportColorCount,
  );
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [previewPixels, setPreviewPixels] = useState<Uint8Array | null>(null);
  const [previewPalette, setPreviewPalette] = useState<readonly string[]>([]);
  const [previewWidth, setPreviewWidth] = useState<number>(resolution);
  const [previewHeight, setPreviewHeight] = useState<number>(resolution);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileReadGenerationRef = useRef(0);
  const previewAdoptedRef = useRef(false);

  const stepIndex = IMPORT_WIZARD_STEPS.indexOf(step);

  useEffect(() => {
    return () => {
      const orphanId = previewProjectId;
      if (orphanId && !previewAdoptedRef.current) {
        void closeProjectSession(orphanId);
      }
    };
  }, [previewProjectId]);

  const handleFileSelected = async (selected: File) => {
    setError(null);
    if (!isAcceptedImageType(selected.type)) {
      setError(errors.importFileType);
      return;
    }

    const generation = ++fileReadGenerationRef.current;

    try {
      const encoded = await fileToBase64(selected);
      if (generation !== fileReadGenerationRef.current) {
        return;
      }
      setFile(selected);
      setImageData(encoded);
    } catch (error) {
      if (generation !== fileReadGenerationRef.current) {
        return;
      }
      logger.error("PixelateWizard", "file_read_failed", { error: errorDetail(error) });
      setError(errors.importFileRead);
    }
  };

  const handleResolutionChange = (value: ResolutionPreset) => {
    setResolution(value);
    setPaletteColorCount((prev) => clampImportColorCount(prev, value));
  };

  const runPreview = useCallback(async () => {
    if (!imageData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    let activeProjectId = previewProjectId;

    if (!activeProjectId) {
      const created = await createBlankProject({
        ...DEFAULT_PROJECT,
        width: resolution,
        height: resolution,
      });

      if (!created.ok) {
        setError(created.message);
        setIsLoading(false);
        return;
      }

      activeProjectId = created.project.id;
      setPreviewProjectId(activeProjectId);
    }

    const preset = paletteMode === "style" ? getPalettePreset(palettePreset) : undefined;
    if (preset) {
      const saved = await saveImportPalette(activeProjectId, preset.colors);
      if (!saved.ok) {
        setError(saved.message);
        setIsLoading(false);
        return;
      }
    }

    const effectiveColorCount = clampImportColorCount(paletteColorCount, resolution);

    const pixelateBody = {
      imageData,
      targetWidth: resolution,
      targetHeight: resolution,
      frameIndex: 0,
      removeBackground,
      ...(paletteMode === "image" ? { maxColors: effectiveColorCount } : {}),
    };

    const pixelate = await pixelateImage(activeProjectId, pixelateBody);

    if (!pixelate.ok) {
      setError(pixelate.message);
      setIsLoading(false);
      return;
    }

    const { response } = pixelate;
    const pixels = new Uint8Array(response.pixels.length);
    for (let i = 0; i < response.pixels.length; i++) {
      pixels[i] = response.pixels[i] ?? 0;
    }

    let palette: readonly string[] = [];
    if (response.palette) {
      palette = paletteColorsFromApi(response.palette);
    } else {
      const fetched = await fetchPalette(activeProjectId);
      if (fetched.ok) {
        palette = paletteColorsFromApi(fetched.palette);
      } else if (preset) {
        palette = paletteColorsFromPresetSlots(preset.colors);
      }
    }

    setPreviewPixels(pixels);
    setPreviewPalette(palette);
    setPreviewWidth(response.width);
    setPreviewHeight(response.height);
    setIsLoading(false);
  }, [
    imageData,
    paletteColorCount,
    paletteMode,
    palettePreset,
    previewProjectId,
    removeBackground,
    resolution,
  ]);

  const goNext = async () => {
    if (step === "file") {
      if (!file || !imageData) {
        setError(errors.importFileType);
        return;
      }
      setStep("resolution");
      return;
    }

    if (step === "resolution") {
      setLastResolution(resolution);
      setRemoveBackground(removeBackground);
      setStep("palette");
      return;
    }

    if (step === "palette") {
      setLastImportPaletteMode(paletteMode);
      setLastImportColorCount(paletteColorCount);
      if (paletteMode === "style") {
        setLastPalettePreset(palettePreset);
      }
      setStep("preview");
      await runPreview();
      return;
    }

    if (step === "preview" && previewProjectId) {
      previewAdoptedRef.current = true;
      const loaded = await loadProjectIntoEditor(previewProjectId);
      if (!loaded.ok) {
        setError(loaded.message);
        return;
      }
      setHasVisited(true);
      setLastEntryPath("import");
      onComplete();
    }
  };

  const goBack = () => {
    setError(null);
    if (step === "file") {
      onBack();
      return;
    }
    const prev = IMPORT_WIZARD_STEPS[stepIndex - 1];
    if (prev) {
      setStep(prev);
    }
  };

  const goToStep = (targetStep: ImportWizardStep) => {
    const targetIndex = IMPORT_WIZARD_STEPS.indexOf(targetStep);
    if (targetIndex > stepIndex) {
      return;
    }
    setError(null);
    setStep(targetStep);
  };

  const canContinue =
    step === "file"
      ? Boolean(file && imageData)
      : step === "preview"
        ? Boolean(previewPixels && !isLoading && !error)
        : true;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">
          {copy.importWizardTitle}
        </h1>
        <ImportStepIndicator
          currentStep={step}
          onStepSelect={goToStep}
          className="mt-4"
        />
      </div>

      <div
        id="import-wizard-panel-file"
        role="tabpanel"
        aria-labelledby="import-wizard-tab-file"
        hidden={step !== "file"}
      >
        {step === "file" ? (
          <FileDropStep
            file={file}
            error={error}
            onFileSelected={handleFileSelected}
          />
        ) : null}
      </div>

      <div
        id="import-wizard-panel-resolution"
        role="tabpanel"
        aria-labelledby="import-wizard-tab-resolution"
        hidden={step !== "resolution"}
      >
        {step === "resolution" ? (
          <ResolutionStep
            value={resolution}
            onChange={handleResolutionChange}
            removeBackground={removeBackground}
            onRemoveBackgroundChange={setRemoveBackground}
          />
        ) : null}
      </div>

      <div
        id="import-wizard-panel-palette"
        role="tabpanel"
        aria-labelledby="import-wizard-tab-palette"
        hidden={step !== "palette"}
      >
        {step === "palette" ? (
          <PaletteStep
            resolution={resolution}
            mode={paletteMode}
            onModeChange={setPaletteMode}
            presetId={palettePreset}
            onPresetChange={setPalettePreset}
            colorCount={paletteColorCount}
            onColorCountChange={setPaletteColorCount}
          />
        ) : null}
      </div>

      <div
        id="import-wizard-panel-preview"
        role="tabpanel"
        aria-labelledby="import-wizard-tab-preview"
        hidden={step !== "preview"}
      >
        {step === "preview" && previewPixels ? (
          <PreviewStep
            pixels={previewPixels}
            gridWidth={previewWidth}
            gridHeight={previewHeight}
            paletteColors={previewPalette}
            isLoading={isLoading}
            error={error}
          />
        ) : null}

        {step === "preview" && !previewPixels && isLoading ? (
          <PreviewStep
            pixels={new Uint8Array()}
            gridWidth={resolution}
            gridHeight={resolution}
            paletteColors={[]}
            isLoading
            error={error}
          />
        ) : null}

        {step === "preview" && !previewPixels && !isLoading && error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="secondary" onClick={goBack}>
          {copy.importWizardBack}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canContinue || isLoading}
          onClick={() => void goNext()}
        >
          {step === "preview" ? copy.importWizardAccept : copy.importWizardNext}
        </Button>
      </div>
    </div>
  );
}
