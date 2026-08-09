import { Button } from "@/components/ui";
import { copy } from "@/content/copy";
import type { UpdateCheckResult } from "@/lib/desktop";

type StartupUpdateBannerProps = {
  updateInfo: UpdateCheckResult;
  showTechnicalInfo?: boolean;
  onInstall: () => void;
  onDismiss: () => void;
};

export function StartupUpdateBanner({
  updateInfo,
  showTechnicalInfo = false,
  onInstall,
  onDismiss,
}: StartupUpdateBannerProps) {
  const commit = showTechnicalInfo ? updateInfo.mainCommit : undefined;
  const message = copy.updateDialogUpdateAvailable(
    updateInfo.currentVersion,
    updateInfo.latestVersion,
    commit,
  );

  return (
    <div
      role="status"
      className="mb-8 rounded-panel border border-accent/40 bg-accent-muted px-4 py-3 text-left"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-primary">{copy.startupUpdateBannerTitle}</p>
      <p className="mt-1 text-sm text-secondary">{message}</p>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" className="min-h-10" onClick={onDismiss}>
          {copy.updateDialogLater}
        </Button>
        <Button type="button" variant="primary" className="min-h-10" onClick={onInstall}>
          {copy.updateDialogInstall}
        </Button>
      </div>
    </div>
  );
}
