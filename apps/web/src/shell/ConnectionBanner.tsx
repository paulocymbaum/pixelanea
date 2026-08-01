import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { retryApiHealthCheck } from "@/lib/apiHealth";
import { useUiStore } from "@/state/uiStore";

export function ConnectionBanner() {
  const apiStatus = useUiStore((s) => s.apiStatus);
  const setApiStatus = useUiStore((s) => s.setApiStatus);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    void retryApiHealthCheck(setApiStatus).finally(() => {
      setIsRetrying(false);
    });
  }, [setApiStatus]);

  if (apiStatus !== "disconnected") {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-center gap-3 border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-sm text-danger"
    >
      <span>{errors.apiDisconnected}</span>
      <Button
        type="button"
        variant="secondary"
        className="h-8 min-h-8 px-3 text-sm"
        onClick={handleRetry}
        disabled={isRetrying}
      >
        {copy.connectionBannerRetry}
      </Button>
    </div>
  );
}
