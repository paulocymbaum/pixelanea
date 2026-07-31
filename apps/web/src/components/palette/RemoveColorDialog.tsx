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

type RemoveColorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function RemoveColorDialog({
  open,
  onOpenChange,
  onConfirm,
}: RemoveColorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.paletteRemoveInUseTitle}</DialogTitle>
          <DialogDescription>
            {copy.paletteRemoveInUseDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {copy.paletteRemoveCancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {copy.paletteRemoveConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
