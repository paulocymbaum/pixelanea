import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  PALETTE_MAX_COLORS,
  PALETTE_MIN_COLORS,
  isColorIndexInUse,
} from "@/state/paletteUtils";
import {
  useActiveColorIndex,
  useEditorStore,
  usePaletteColors,
} from "@/state/editorStore";
import { Minus, Pencil, Plus } from "lucide-react";
import {
  PaletteColorDialog,
  type PaletteColorDialogMode,
} from "./PaletteColorDialog";
import { RemoveColorDialog } from "./RemoveColorDialog";

type PaletteActionsProps = {
  className?: string;
};

export function PaletteActions({ className }: PaletteActionsProps) {
  const colors = usePaletteColors();
  const activeIndex = useActiveColorIndex();
  const pixels = useEditorStore((s) => s.pixels);
  const addPaletteColor = useEditorStore((s) => s.addPaletteColor);
  const updatePaletteColor = useEditorStore((s) => s.updatePaletteColor);
  const removePaletteColor = useEditorStore((s) => s.removePaletteColor);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [colorDialogMode, setColorDialogMode] =
    useState<PaletteColorDialogMode>("add");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const activeHex = colors[activeIndex] ?? copy.paletteDefaultNewColor;
  const canAdd = colors.length < PALETTE_MAX_COLORS;
  const canRemove = colors.length > PALETTE_MIN_COLORS;
  const paletteLocked = useEditorStore((s) => s.paletteLocked);
  const colorInUse = isColorIndexInUse(pixels, activeIndex);

  const openColorDialog = (mode: PaletteColorDialogMode) => {
    setColorDialogMode(mode);
    setColorDialogOpen(true);
  };

  const handleSaveColor = (hex: string) => {
    if (colorDialogMode === "add") {
      addPaletteColor(hex);
    } else {
      updatePaletteColor(activeIndex, hex);
    }
  };

  const handleRemove = () => {
    if (colorInUse) {
      setRemoveDialogOpen(true);
      return;
    }
    removePaletteColor(activeIndex);
  };

  const confirmRemove = () => {
    removePaletteColor(activeIndex);
  };

  const dialogInitialColor =
    colorDialogMode === "add" ? copy.paletteDefaultNewColor : activeHex;

  return (
    <div className={cn("flex gap-2 border-t border-border p-3", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canAdd || paletteLocked}
            onClick={() => openColorDialog("add")}
            className="min-h-10 min-w-10"
            aria-label={copy.paletteAddColor}
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copy.paletteAddColor}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={paletteLocked}
            onClick={() => openColorDialog("edit")}
            className="min-h-10 min-w-10"
            aria-label={copy.paletteEditColor}
          >
            <Pencil className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copy.paletteEditColor}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canRemove || paletteLocked}
            onClick={handleRemove}
            className="min-h-10 min-w-10"
            aria-label={copy.paletteRemoveColor}
          >
            <Minus className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copy.paletteRemoveColor}</TooltipContent>
      </Tooltip>

      <PaletteColorDialog
        open={colorDialogOpen}
        onOpenChange={setColorDialogOpen}
        mode={colorDialogMode}
        initialColor={dialogInitialColor}
        onSave={handleSaveColor}
      />

      <RemoveColorDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
