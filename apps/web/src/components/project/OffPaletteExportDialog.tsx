import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { copy } from "@/content/copy";
import type { OffPaletteReport } from "@/canvas/offPaletteCheck";

type OffPaletteExportDialogProps = {
  open: boolean;
  report: OffPaletteReport | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function OffPaletteExportDialog({
  open,
  report,
  onOpenChange,
  onConfirm,
}: OffPaletteExportDialogProps) {
  if (!report) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.exportOffPaletteTitle}</DialogTitle>
          <DialogDescription>
            {copy.exportOffPaletteDescription(
              report.offPaletteCellCount,
              report.affectedFrameCount,
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {copy.exportOffPaletteCancel}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {copy.exportOffPaletteConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
