import { errors as contentErrors } from "@/content/errors";
import { ApiError } from "@pixelanea/api-client";

/** Map known C++ bundle I/O substrings to plain copy (S1-912). */
export function mapBundleIoMessage(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes("checksum mismatch")) {
    return contentErrors.bundleChecksumMismatch;
  }
  if (lower.includes("unsafe bundle entry")) {
    return contentErrors.bundleUnsafeEntry;
  }
  if (lower.includes("could not write bundle")) {
    return contentErrors.bundleWriteFailed;
  }
  if (lower.includes("already open")) {
    return contentErrors.projectAlreadyOpen;
  }

  return null;
}

export function mapApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const raw = error.body?.message ?? error.message;
    return mapBundleIoMessage(raw) ?? raw;
  }
  return contentErrors.apiDisconnected;
}

export function mapBundleApiError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    const raw = error.body?.message ?? error.message;
    return mapBundleIoMessage(raw) ?? fallback;
  }
  return contentErrors.apiDisconnected;
}
