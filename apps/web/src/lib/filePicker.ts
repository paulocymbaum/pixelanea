import { ApiError } from "@pixelanea/api-client";
import { getApiClient } from "@/api/client";
import { errors } from "@/content/errors";

export type PickProjectPathInput = {
  mode: "open" | "saveAs";
  defaultPath?: string;
  defaultName?: string;
};

export type PickProjectPathResult =
  | { ok: true; path: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string };

/** `null` means the tier is unavailable — try the next tier. */
export type PickProjectPathTierResult = PickProjectPathResult | null;

export type FilePickerTiers = {
  tryServerDialog: (
    input: PickProjectPathInput,
  ) => Promise<PickProjectPathTierResult>;
  tryFileSystemAccess: (
    input: PickProjectPathInput,
  ) => Promise<PickProjectPathTierResult>;
  tryFallbackDialog: (
    input: PickProjectPathInput,
  ) => Promise<PickProjectPathResult>;
};

export type PickProjectPathOptions = {
  tiers?: Partial<FilePickerTiers>;
};

function success(path: string): PickProjectPathResult {
  return { ok: true, path };
}

function cancelled(): PickProjectPathResult {
  return { ok: false, cancelled: true };
}

function failure(message: string): PickProjectPathResult {
  return { ok: false, cancelled: false, message };
}

export async function tryServerDialogTier(
  input: PickProjectPathInput,
): Promise<PickProjectPathTierResult> {
  try {
    const response = await getApiClient().pickProjectPath({
      mode: input.mode,
      defaultPath: input.defaultPath,
      defaultName: input.defaultName,
    });

    if (response.cancelled) {
      return cancelled();
    }

    if (response.path) {
      return success(response.path);
    }

    return failure(errors.filePickerUnavailable);
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return null;
    }
    if (error instanceof ApiError) {
      return failure(error.message);
    }
    return null;
  }
}

/**
 * File System Access API tier.
 *
 * Limitation: browser file handles do not expose host filesystem paths, so the
 * local Pixelanea server cannot open or save bundles from FSA selections alone.
 * This tier always declines so the ProjectPathDialog fallback can collect a path.
 */
export async function tryFileSystemAccessTier(): Promise<PickProjectPathTierResult> {
  if (
    typeof window === "undefined" ||
    !("showOpenFilePicker" in window) ||
    !("showSaveFilePicker" in window)
  ) {
    return null;
  }

  return null;
}

const defaultTiers: FilePickerTiers = {
  tryServerDialog: tryServerDialogTier,
  tryFileSystemAccess: tryFileSystemAccessTier,
  tryFallbackDialog: async () => failure(errors.filePickerUnavailable),
};

export async function pickProjectPath(
  input: PickProjectPathInput,
  options: PickProjectPathOptions = {},
): Promise<PickProjectPathResult> {
  const tiers: FilePickerTiers = {
    ...defaultTiers,
    ...options.tiers,
  };

  const serverResult = await tiers.tryServerDialog(input);
  if (serverResult !== null) {
    return serverResult;
  }

  const fsaResult = await tiers.tryFileSystemAccess(input);
  if (fsaResult !== null) {
    return fsaResult;
  }

  return tiers.tryFallbackDialog(input);
}
