import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  CANVAS_SIZE_MAX,
  CANVAS_SIZE_MIN,
  clampCanvasDimension,
  type CanvasSize,
  isValidCanvasSize,
  parseCanvasDimensionInput,
} from "@/components/project/canvasSize";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";

type CustomCanvasSizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSize: CanvasSize;
  onConfirm: (size: CanvasSize) => void;
};

export function CustomCanvasSizeDialog({
  open,
  onOpenChange,
  initialSize,
  onConfirm,
}: CustomCanvasSizeDialogProps) {
  const [widthInput, setWidthInput] = useState(String(initialSize.width));
  const [heightInput, setHeightInput] = useState(String(initialSize.height));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWidthInput(String(initialSize.width));
      setHeightInput(String(initialSize.height));
      setValidationError(null);
    }
  }, [open, initialSize.width, initialSize.height]);

  const handleConfirm = () => {
    const width = parseCanvasDimensionInput(widthInput);
    const height = parseCanvasDimensionInput(heightInput);

    if (width === null || height === null) {
      setValidationError(errors.invalidCanvasSize);
      return;
    }

    const size = {
      width: clampCanvasDimension(width),
      height: clampCanvasDimension(height),
    };

    if (!isValidCanvasSize(size)) {
      setValidationError(errors.invalidCanvasSize);
      return;
    }

    onConfirm(size);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.customCanvasSizeTitle}</DialogTitle>
          <DialogDescription>{copy.customCanvasSizeDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-primary"
              htmlFor="custom-canvas-width"
            >
              {copy.customCanvasSizeWidthLabel}
            </label>
            <input
              id="custom-canvas-width"
              type="number"
              min={CANVAS_SIZE_MIN}
              max={CANVAS_SIZE_MAX}
              value={widthInput}
              onChange={(event) => {
                setWidthInput(event.target.value);
                setValidationError(null);
              }}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-primary"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-primary"
              htmlFor="custom-canvas-height"
            >
              {copy.customCanvasSizeHeightLabel}
            </label>
            <input
              id="custom-canvas-height"
              type="number"
              min={CANVAS_SIZE_MIN}
              max={CANVAS_SIZE_MAX}
              value={heightInput}
              onChange={(event) => {
                setHeightInput(event.target.value);
                setValidationError(null);
              }}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-primary"
              autoComplete="off"
            />
          </div>
        </div>

        <p className="text-sm text-secondary">{copy.customCanvasSizeHint}</p>

        {validationError ? (
          <p className="text-sm text-danger" role="alert">
            {validationError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {copy.projectCancel}
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm}>
            {copy.customCanvasSizeConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
