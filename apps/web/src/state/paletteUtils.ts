/** Whether any canvas cell uses the given palette index. */
export function isColorIndexInUse(pixels: Uint8Array, index: number): boolean {
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] === index) {
      return true;
    }
  }
  return false;
}

/** After removing palette slot `removedIndex`, remap pixel indices and clear removed slot to 0. */
export function remapPixelsAfterRemove(
  pixels: Uint8Array,
  removedIndex: number,
): Uint8Array {
  const next = new Uint8Array(pixels);
  for (let i = 0; i < next.length; i++) {
    const value = next[i];
    if (value === removedIndex) {
      next[i] = 0;
    } else if (value > removedIndex) {
      next[i] = value - 1;
    }
  }
  return next;
}

const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

/** Normalize to `#RRGGBB` or return null if invalid. */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const match = HEX_PATTERN.exec(withHash);
  if (!match) {
    return null;
  }
  return `#${match[1].toUpperCase()}`;
}

export const PALETTE_MIN_COLORS = 1;
export const PALETTE_MAX_COLORS = 256;
