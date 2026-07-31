const PIXELANEA_EXTENSION = ".pixelanea";

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

export function isValidProjectPath(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length > 0 && trimmed.toLowerCase().endsWith(PIXELANEA_EXTENSION);
}
