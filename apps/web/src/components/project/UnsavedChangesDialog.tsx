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

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSave?: () => void;
  canSave?: boolean;
};

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onSave,
  canSave = false,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.discardChangesTitle}</DialogTitle>
          <DialogDescription>{copy.discardChangesBody}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {copy.discardChangesCancel}
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard}>
            {copy.discardChangesConfirm}
          </Button>
          {canSave && onSave ? (
            <Button type="button" variant="primary" onClick={onSave}>
              {copy.discardChangesSave}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
