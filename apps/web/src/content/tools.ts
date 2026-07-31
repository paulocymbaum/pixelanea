export const tools = {
  paint: "Paint",
  eraser: "Fix mistakes",
  eyedropper: "Eyedropper",
  import: "Import",
  frameDuplicate: "Duplicate frames",
} as const;

export type ToolId = keyof typeof tools;
