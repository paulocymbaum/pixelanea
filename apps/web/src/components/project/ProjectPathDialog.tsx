import { useEffect, useState } from "react";
import type { AssetType } from "@pixelanea/api-client";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { ASSET_TYPES, DEFAULT_ASSET_TYPE } from "@/content/assetTypes";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { cn } from "@/lib/cn";
import { isValidProjectPath, normalizeProjectPath } from "./pathUtils";

type ProjectPathDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "open" | "saveAs";
  initialPath?: string;
  initialAssetType?: AssetType;
  animationAssetTypeEnabled?: boolean;
  onSubmit: (result: { path: string; assetType?: AssetType }) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

function assetTypeLabel(type: AssetType): string {
  switch (type) {
    case "character":
      return copy.projectAssetTypeCharacter;
    case "prop":
      return copy.projectAssetTypeProp;
    case "background":
      return copy.projectAssetTypeBackground;
    case "animation":
      return copy.projectAssetTypeAnimation;
  }
}

function assetTypeHint(type: AssetType): string {
  switch (type) {
    case "character":
      return copy.projectAssetTypeCharacterHint;
    case "prop":
      return copy.projectAssetTypePropHint;
    case "background":
      return copy.projectAssetTypeBackgroundHint;
    case "animation":
      return copy.projectAssetTypeAnimationHint;
  }
}

export function ProjectPathDialog({
  open,
  onOpenChange,
  mode,
  initialPath = "",
  initialAssetType = DEFAULT_ASSET_TYPE,
  animationAssetTypeEnabled = false,
  onSubmit,
  isSubmitting = false,
  error = null,
}: ProjectPathDialogProps) {
  const [path, setPath] = useState(initialPath);
  const [assetType, setAssetType] = useState<AssetType>(initialAssetType);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPath(initialPath);
      setAssetType(initialAssetType);
      setValidationError(null);
    }
  }, [open, initialPath, initialAssetType]);

  useEffect(() => {
    if (!animationAssetTypeEnabled && assetType === "animation") {
      setAssetType(DEFAULT_ASSET_TYPE);
    }
  }, [animationAssetTypeEnabled, assetType]);

  const title =
    mode === "open" ? copy.projectOpenTitle : copy.projectSaveAsTitle;
  const description =
    mode === "open"
      ? copy.projectOpenDescription
      : copy.projectSaveAsDescription;
  const confirmLabel = isSubmitting
    ? mode === "open"
      ? copy.projectOpening
      : copy.projectSaving
    : mode === "open"
      ? copy.projectOpenConfirm
      : copy.projectSaveConfirm;

  const handleSubmit = () => {
    const normalized = normalizeProjectPath(path);
    if (!isValidProjectPath(normalized)) {
      setValidationError(errors.invalidProjectPath);
      return;
    }
    onSubmit(
      mode === "saveAs"
        ? { path: normalized, assetType }
        : { path: normalized },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode === "saveAs" ? (
            <fieldset className="flex flex-col gap-2 border-0 p-0">
              <legend className="text-sm font-medium text-primary">
                {copy.projectAssetTypeLabel}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ASSET_TYPES.map((type) => {
                  const disabled =
                    type === "animation" && !animationAssetTypeEnabled;
                  const selected = assetType === type;
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={selected ? "primary" : "secondary"}
                      className={cn(
                        "flex h-auto min-h-16 flex-col items-start gap-1 px-4 py-3 text-left",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                      onClick={() => {
                        if (!disabled) {
                          setAssetType(type);
                        }
                      }}
                      disabled={isSubmitting || disabled}
                      aria-pressed={selected}
                      aria-disabled={disabled}
                    >
                      <span className="font-semibold">{assetTypeLabel(type)}</span>
                      <span className="text-sm opacity-80">
                        {disabled
                          ? copy.projectAssetTypeAnimationDisabledHint
                          : assetTypeHint(type)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-primary" htmlFor="project-path">
              {copy.projectPathLabel}
            </label>
            <input
              id="project-path"
              type="text"
              value={path}
              onChange={(event) => {
                setPath(event.target.value);
                setValidationError(null);
              }}
              placeholder={copy.projectPathPlaceholder}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-primary disabled:cursor-not-allowed disabled:opacity-60"
              autoComplete="off"
              spellCheck={false}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            />
            <p className="text-sm text-secondary">{copy.projectPathHint}</p>
            {validationError ? (
              <p className="text-sm text-danger" role="alert">{validationError}</p>
            ) : null}
            {error && !validationError ? (
              <p className="text-sm text-danger" role="alert">{error}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {copy.projectCancel}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
