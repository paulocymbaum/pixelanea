import { useEffect, useState } from "react";
import {
  checkForDesktopUpdates,
  checkUpdateConnection,
  isDesktopShell,
  type UpdateCheckResult,
} from "@/lib/desktop";
import { useApiStatus } from "@/state/uiStore";

/**
 * On desktop shell, checks GitHub once per mount when the API reports a version.
 * Used on the new-project landing page to surface install prompts before a project opens.
 */
export function useStartupDesktopUpdateCheck(enabled: boolean): UpdateCheckResult | null {
  const { status, version } = useApiStatus();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [checkedForVersion, setCheckedForVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isDesktopShell() || status !== "connected" || !version) {
      return;
    }
    if (checkedForVersion === version) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const connection = await checkUpdateConnection();
        if (!connection.connected) {
          return;
        }
        const result = await checkForDesktopUpdates(version);
        if (cancelled) {
          return;
        }
        setCheckedForVersion(version);
        if (result.updateAvailable) {
          setUpdateInfo(result);
        } else {
          setUpdateInfo(null);
        }
      } catch {
        if (!cancelled) {
          setCheckedForVersion(version);
          setUpdateInfo(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, status, version, checkedForVersion]);

  return updateInfo;
}
