/** Compute active frame index after reordering the strip. */
export function activeIndexAfterReorder(
  activeIndex: number,
  fromIndex: number,
  toIndex: number,
): number {
  if (activeIndex === fromIndex) {
    return toIndex;
  }
  if (fromIndex < toIndex) {
    if (activeIndex > fromIndex && activeIndex <= toIndex) {
      return activeIndex - 1;
    }
  } else if (fromIndex > toIndex) {
    if (activeIndex >= toIndex && activeIndex < fromIndex) {
      return activeIndex + 1;
    }
  }
  return activeIndex;
}

/**
 * Re-key cached frame buffers for the same move. A reorder is a permutation the
 * client already knows, so cached pixels travel with their frame instead of
 * being refetched. Sparse caches stay sparse.
 */
export function reorderFramePixels(
  framePixelsByIndex: Record<number, Uint8Array>,
  fromIndex: number,
  toIndex: number,
): Record<number, Uint8Array> {
  if (fromIndex === toIndex) {
    return framePixelsByIndex;
  }

  const reordered: Record<number, Uint8Array> = {};
  for (const [key, pixels] of Object.entries(framePixelsByIndex)) {
    reordered[activeIndexAfterReorder(Number(key), fromIndex, toIndex)] = pixels;
  }
  return reordered;
}
