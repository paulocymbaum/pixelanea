import { useState } from "react";
import { Button } from "@/components/ui/Button";
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
  const savePalette = useEditorStore((s) => s.savePalette);

  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [colorDialogMode, setColorDialogMode] =
    useState<PaletteColorDialogMode>("add");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const activeHex = colors[activeIndex] ?? copy.paletteDefaultNewColor;
  const canAdd = colors.length < PALETTE_MAX_COLORS;
  const canRemove = colors.length > PALETTE_MIN_COLORS;
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
    savePalette();
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
    <div className={cn("flex flex-col gap-2 border-t border-border p-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="default"
          disabled={!canAdd}
          onClick={() => openColorDialog("add")}
          className="min-h-10"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {copy.paletteAddColor}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={() => openColorDialog("edit")}
          className="min-h-10"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
          {copy.paletteEditColor}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="default"
          disabled={!canRemove}
          onClick={handleRemove}
          className="min-h-10"
        >
          <Minus className="h-4 w-4" strokeWidth={1.5} />
          {copy.paletteRemoveColor}
        </Button>
      </div>

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
