/**
 * Sprint 1 MVP feature flags — toggle post-MVP surfaces here only.
 * Defaults keep File → Export PNG and hide advanced animation/export chrome.
 * Re-enable spritesheet/GIF: set flags true and restore handlers in shell/exportActions.ts (R1-514).
 */
export const features = {
  exportSpritesheet: false,
  exportGif: false,
  onionSkin: false,
} as const;
