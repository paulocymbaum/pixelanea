export const tools = {
  paint: "Paint",
  eraser: "Fix mistakes",
  eyedropper: "Eyedropper",
  fill: "Fill",
  line: "Line",
  import: "Import",
  frameDuplicate: "Duplicate frames",
} as const;

export type ToolId = keyof typeof tools;
