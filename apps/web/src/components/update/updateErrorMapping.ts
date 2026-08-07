import { copy } from "@/content/copy";
import type { InstallKind, UpdateErrorCode } from "@/lib/desktop";

export function mapInstallErrorMessage(
  message: string,
  errorCode?: UpdateErrorCode | null,
  installKind?: InstallKind | null,
): string {
  if (errorCode === "gatekeeper" || message.includes("ERROR_GATEKEEPER:")) {
    return copy.updateErrorGatekeeper;
  }
  if (errorCode === "partial" || message.includes("ERROR_PARTIAL:")) {
    return copy.updateErrorPartial;
  }
  if (
    installKind === "windows_installer" &&
    (errorCode === "permission_denied" || message.includes("ERROR_UAC:"))
  ) {
    return copy.updateErrorUac;
  }
  if (
    message.includes("UAC") ||
    message.includes("Windows blocked") ||
    message.includes("ERROR_UAC:")
  ) {
    return copy.updateErrorUac;
  }
  if (errorCode === "permission_denied" || message.includes("ERROR_PERMISSION:")) {
    return copy.updateErrorPermission;
  }
  return message;
}

export function shouldOfferReleasePage(
  phase: "error" | string,
  errorCode: UpdateErrorCode | null,
  message: string,
): boolean {
  return (
    phase === "error" &&
    (errorCode != null ||
      message.includes("ERROR_UAC:") ||
      message.includes("ERROR_GATEKEEPER:") ||
      message.includes("ERROR_PERMISSION:") ||
      message.includes("ERROR_PARTIAL:") ||
      message.includes("github.com") ||
      message.includes("releases"))
  );
}
