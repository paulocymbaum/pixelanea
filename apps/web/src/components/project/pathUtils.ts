const PIXELANEA_EXTENSION = ".pixelanea";

export function basename(path: string): string {
  const trimmed = path.trim().replace(/[/\\]+$/, "");
  if (!trimmed) {
    return "";
  }
  const filename = trimmed.split(/[/\\]/).pop();
  return filename ?? "";
}

export function deriveDefaultName(bundlePath: string | null | undefined): string | undefined {
  if (!bundlePath) {
    return undefined;
  }
  const filename = bundlePath.split(/[/\\]/).pop();
  if (!filename) {
    return undefined;
  }
  const stem = filename.replace(/\.pixelanea$/i, "");
  return stem || undefined;
}

export function normalizeProjectPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.toLowerCase().endsWith(PIXELANEA_EXTENSION)) {
    return trimmed;
  }
  return `${trimmed}${PIXELANEA_EXTENSION}`;
}

/** True when the path has a non-empty extension that is not `.pixelanea`. */
export function hasNonPixelaneaExtension(input: string): boolean {
  const trimmed = input.trim();
  const lastSlash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const filename = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) {
    return false;
  }
  return filename.slice(dotIndex).toLowerCase() !== PIXELANEA_EXTENSION;
}

export function isValidProjectPath(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length > 0 && trimmed.toLowerCase().endsWith(PIXELANEA_EXTENSION);
}
