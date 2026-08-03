/** Frame index to draw as onion skin for the active frame (previous while editing). */
export function resolveOnionSkinFrameIndex(
  activeFrameIndex: number,
  frameCount: number,
  isPlaying: boolean,
  playbackDirection: 1 | -1,
): number | null {
  if (frameCount <= 1) {
    return null;
  }

  const onionIndex = isPlaying
    ? activeFrameIndex - playbackDirection
    : activeFrameIndex - 1;

  if (onionIndex < 0 || onionIndex >= frameCount) {
    return null;
  }

  return onionIndex;
}
