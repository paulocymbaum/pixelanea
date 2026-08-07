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
  type UpdateErrorCode,
} from "@/lib/desktop";
import {
  mapInstallErrorMessage,
  shouldOfferReleasePage,
} from "./updateErrorMapping";

const RELEASE_PAGE_URL = "https://github.com/pixelanea/pixelanea/releases";

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
  showTechnicalInfo?: boolean;
  hasUnsavedWork?: boolean;
  canSave?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
};

export function UpdateDialog({
  open,
  onOpenChange,
  currentVersion,
  showTechnicalInfo = false,
  hasUnsavedWork = false,
  canSave = false,
  isSaving = false,
  onSave,
}: UpdateDialogProps) {
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [message, setMessage] = useState("");
  const [rawErrorMessage, setRawErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<UpdateErrorCode | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [restartWithoutSaving, setRestartWithoutSaving] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setMessage("");
    setRawErrorMessage("");
    setErrorCode(null);
    setUpdateInfo(null);
    setRestartWithoutSaving(false);
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

      const commit = showTechnicalInfo ? result.mainCommit : undefined;

      if (result.updateAvailable) {
        setPhase("update_available");
        setMessage(
          copy.updateDialogUpdateAvailable(
            result.currentVersion,
            result.latestVersion,
            commit,
          ),
        );
        return;
      }

      setPhase("up_to_date");
      setMessage(copy.updateDialogUpToDate(result.latestVersion, commit));
    } catch (error) {
      setPhase("error");
      const text =
        error instanceof Error ? error.message : copy.updateDialogCheckFailed;
      setRawErrorMessage(text);
      setErrorCode(null);
      setMessage(mapInstallErrorMessage(text, null, null));
    }
  }, [currentVersion, showTechnicalInfo]);

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
        setRawErrorMessage(result.message);
        setErrorCode(result.errorCode ?? null);
        setMessage(
          mapInstallErrorMessage(result.message, result.errorCode, updateInfo?.installKind),
        );
        return;
      }

      setPhase("restart_ready");
      setMessage(result.message);
    } catch (error) {
      setPhase("error");
      const text =
        error instanceof Error ? error.message : copy.updateDialogInstallFailed;
      setRawErrorMessage(text);
      setErrorCode(null);
      setMessage(mapInstallErrorMessage(text, null, updateInfo?.installKind));
    }
  };

  const handleRestart = async () => {
    if (hasUnsavedWork && !restartWithoutSaving) {
      return;
    }
    await restartDesktopShell();
  };

  const busy =
    phase === "checking_connection" ||
    phase === "checking_updates" ||
    phase === "downloading";

  const showReleasePage = shouldOfferReleasePage(phase, errorCode, rawErrorMessage || message);
  const restartBlocked = phase === "restart_ready" && hasUnsavedWork && !restartWithoutSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="update-dialog-description">
        <DialogHeader>
          <DialogTitle>{copy.updateDialogTitle}</DialogTitle>
          <DialogDescription id="update-dialog-description">
            {copy.updateDialogDescription}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-secondary">{copy.updateDialogTrustBlock}</p>

        <p className="text-base text-primary" role="status" aria-live="polite">
          {message}
        </p>

        {restartBlocked ? (
          <p className="text-sm text-warning" role="alert">
            {copy.updateDialogUnsavedWarning}
          </p>
        ) : null}

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
              {restartBlocked ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRestartWithoutSaving(true)}
                  >
                    {copy.updateDialogRestartWithoutSaving}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onSave}
                    disabled={!canSave || isSaving}
                  >
                    {copy.updateDialogSaveBeforeRestart}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleRestart()}
                >
                  {copy.updateDialogRestart}
                </Button>
              )}
            </>
          ) : null}

          {phase === "error" || phase === "up_to_date" ? (
            <>
              {showReleasePage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.open(RELEASE_PAGE_URL, "_blank", "noopener,noreferrer")}
                >
                  {copy.updateDialogOpenReleasePage}
                </Button>
              ) : null}
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
