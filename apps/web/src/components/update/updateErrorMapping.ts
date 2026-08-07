import { copy } from "@/content/copy";
import type { InstallKind, UpdateErrorCode } from "@/lib/desktop";

function isWindowsInstallContext(
  installKind: InstallKind | null | undefined,
  message: string,
): boolean {
  return (
    installKind === "windows_installer" ||
    installKind === "windows_portable" ||
    message.includes("ERROR_UAC:") ||
    message.includes("UAC") ||
    message.includes("Windows blocked")
  );
}

function isMacInstallContext(installKind: InstallKind | null | undefined): boolean {
  return installKind === "mac_app_bundle" || installKind === "mac_portable";
}

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

  const permissionError =
    errorCode === "permission_denied" ||
    message.includes("ERROR_PERMISSION:") ||
    message.includes("ERROR_UAC:");

  if (permissionError || isWindowsInstallContext(installKind, message)) {
    if (isWindowsInstallContext(installKind, message)) {
      return copy.updateErrorUac;
    }
    if (isMacInstallContext(installKind)) {
      return copy.updateErrorGatekeeper;
    }
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
