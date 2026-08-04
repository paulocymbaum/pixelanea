import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/state/uiStore";

const TOAST_DURATION_MS = 3000;

export function Toast() {
  const toastMessage = useUiStore((s) => s.toastMessage);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => {
      clearToast();
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (!toastMessage) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-panel border border-border bg-elevated px-4 py-2 text-base text-primary shadow-md",
      )}
      role="status"
      aria-live="polite"
    >
      {toastMessage}
    </div>
  );
}
