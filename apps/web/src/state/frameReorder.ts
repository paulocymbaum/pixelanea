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
