import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { UpdateDialog } from "@/components/update/UpdateDialog";
import { copy } from "@/content/copy";
import { isDesktopShell } from "@/lib/desktop";
import { useApiStatus } from "@/state/uiStore";

export function HelpMenu() {
  const { version } = useApiStatus();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const desktopShell = isDesktopShell();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="text-base">
            {copy.helpMenuLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {desktopShell ? (
            <DropdownMenuItem onSelect={() => setUpdateDialogOpen(true)}>
              {copy.helpMenuCheckForUpdates}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>{copy.helpMenuDesktopOnly}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {desktopShell ? (
        <UpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          currentVersion={version}
        />
      ) : null}
    </>
  );
}
