import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { copy } from "@/content/copy";
import {
  checkForDesktopUpdates,
  checkUpdateConnection,
  downloadAndInstallDesktopUpdate,
  restartDesktopShell,
  type UpdateCheckResult,
} from "@/lib/desktop";

type UpdatePhase =
  | "idle"
  | "checking_connection"
  | "checking_updates"
  | "up_to_date"
  | "update_available"
  | "downloading"
  | "restart_ready"
  | "error";

type UpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string | null;
};

export function UpdateDialog({
  open,
  onOpenChange,
  currentVersion,
}: UpdateDialogProps) {
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [message, setMessage] = useState("");
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setMessage("");
    setUpdateInfo(null);
  }, []);

  const runCheck = useCallback(async () => {
    if (!currentVersion) {
      setPhase("error");
      setMessage(copy.updateDialogVersionUnknown);
      return;
    }

    setPhase("checking_connection");
    setMessage(copy.updateDialogCheckingConnection);

    try {
      const connection = await checkUpdateConnection();
      if (!connection.connected) {
        setPhase("error");
        setMessage(connection.message || copy.updateDialogConnectionFailed);
        return;
      }

      setPhase("checking_updates");
      setMessage(copy.updateDialogCheckingUpdates);

      const result = await checkForDesktopUpdates(currentVersion);
      setUpdateInfo(result);

      if (result.updateAvailable) {
        setPhase("update_available");
        setMessage(
          copy.updateDialogUpdateAvailable(
            result.currentVersion,
            result.latestVersion,
            result.mainCommit,
          ),
        );
        return;
      }

      setPhase("up_to_date");
      setMessage(
        copy.updateDialogUpToDate(result.latestVersion, result.mainCommit),
      );
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : copy.updateDialogCheckFailed,
      );
    }
  }, [currentVersion]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    void runCheck();
  }, [open, reset, runCheck]);

  const handleInstall = async () => {
    if (!updateInfo?.downloadUrl) {
      setPhase("error");
      setMessage(copy.updateDialogNoDownloadUrl);
      return;
    }

    setPhase("downloading");
    setMessage(copy.updateDialogDownloading);

    try {
      const result = await downloadAndInstallDesktopUpdate(updateInfo.downloadUrl);
      if (!result.success) {
        setPhase("error");
        setMessage(result.message);
        return;
      }

      setPhase("restart_ready");
      setMessage(result.message);
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : copy.updateDialogInstallFailed,
      );
    }
  };

  const handleRestart = async () => {
    await restartDesktopShell();
  };

  const busy =
    phase === "checking_connection" ||
    phase === "checking_updates" ||
    phase === "downloading";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="update-dialog-description">
        <DialogHeader>
          <DialogTitle>{copy.updateDialogTitle}</DialogTitle>
          <DialogDescription id="update-dialog-description">
            {copy.updateDialogDescription}
          </DialogDescription>
        </DialogHeader>

        <p className="text-base text-primary" role="status" aria-live="polite">
          {message}
        </p>

        <DialogFooter>
          {phase === "update_available" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {copy.updateDialogLater}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleInstall()}
              >
                {copy.updateDialogInstall}
              </Button>
            </>
          ) : null}

          {phase === "restart_ready" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {copy.updateDialogLater}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleRestart()}
              >
                {copy.updateDialogRestart}
              </Button>
            </>
          ) : null}

          {phase === "error" || phase === "up_to_date" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {copy.updateDialogClose}
              </Button>
              {phase === "error" ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void runCheck()}
                >
                  {copy.updateDialogRetry}
                </Button>
              ) : null}
            </>
          ) : null}

          {busy ? (
            <Button type="button" variant="ghost" disabled>
              {copy.updateDialogWorking}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
