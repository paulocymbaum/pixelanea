/** Palette index 0 — empty cell (checkerboard shows through). */
export const TRANSPARENT_INDEX = 0;

export const UNDO_STACK_CAP = 500;

export interface Command {
  apply(pixels: Uint8Array, gridWidth: number): void;
  revert(pixels: Uint8Array, gridWidth: number): void;
}

export function cellIndex(x: number, y: number, gridWidth: number): number {
  return y * gridWidth + x;
}
