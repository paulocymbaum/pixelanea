type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  const internals = (window as Window & { __TAURI_INTERNALS__?: { invoke?: TauriInvoke } })
    .__TAURI_INTERNALS__;
  return internals?.invoke ?? null;
}

export function isDesktopShell(): boolean {
  return getTauriInvoke() !== null;
}

async function invokeDesktop<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop shell is not available.");
  }
  return invoke<T>(command, args);
}

export type InstallKind =
  | "user_local"
  | "portable"
  | "system_deb"
  | "windows_installer"
  | "windows_portable"
  | "mac_app_bundle"
  | "mac_portable";

export type ConnectionStatus = {
  connected: boolean;
  message: string;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  mainCommit: string;
  updateAvailable: boolean;
  downloadUrl: string | null;
  installKind: InstallKind;
};

export type UpdateErrorCode =
  | "permission_denied"
  | "gatekeeper"
  | "partial"
  | "generic";

export type InstallResult = {
  success: boolean;
  message: string;
  requiresRestart: boolean;
  errorCode?: UpdateErrorCode | null;
};

export function checkUpdateConnection(): Promise<ConnectionStatus> {
  return invokeDesktop<ConnectionStatus>("updater_check_connection");
}

export function checkForDesktopUpdates(
  currentVersion: string,
): Promise<UpdateCheckResult> {
  return invokeDesktop<UpdateCheckResult>("updater_check_for_updates", {
    currentVersion,
  });
}

export function downloadAndInstallDesktopUpdate(
  downloadUrl: string,
): Promise<InstallResult> {
  return invokeDesktop<InstallResult>("updater_download_and_install", {
    downloadUrl,
  });
}

export function restartDesktopShell(): Promise<void> {
  return invokeDesktop<void>("updater_restart_app");
}
