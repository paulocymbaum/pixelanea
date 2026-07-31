import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { ShadingPalettePicker } from "./ShadingPalettePicker";

export type PaletteColorDialogMode = "add" | "edit";

type PaletteColorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PaletteColorDialogMode;
  initialColor: string;
  onSave: (hex: string) => void;
};

export function PaletteColorDialog({
  open,
  onOpenChange,
  mode,
  initialColor,
  onSave,
}: PaletteColorDialogProps) {
  const [draftColor, setDraftColor] = useState(initialColor);

  useEffect(() => {
    if (open) {
      setDraftColor(initialColor);
    }
  }, [open, initialColor]);

  const title =
    mode === "add" ? copy.paletteAddColorTitle : copy.paletteEditColorTitle;
  const description =
    mode === "add"
      ? copy.paletteAddColorDescription
      : copy.paletteEditColorDescription;

  const handleSave = () => {
    onSave(draftColor);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 shrink-0 rounded-md border-2 border-border"
            style={{ backgroundColor: draftColor }}
            aria-hidden="true"
          />
          <input
            type="color"
            value={draftColor}
            onChange={(event) => setDraftColor(event.target.value)}
            className="h-12 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-surface p-1"
            aria-label={copy.paletteColorPickerLabel}
          />
        </div>

        <ShadingPalettePicker
          baseColor={draftColor}
          onSelectShade={setDraftColor}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {copy.paletteCancel}
          </Button>
          <Button type="button" onClick={handleSave}>
            {copy.paletteSaveColor}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
