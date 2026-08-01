export const errors = {
  apiDisconnected: "Can't reach the local API. Is the server running?",
  apiCheckFailed: "API health check failed.",
  importFileType: "Use a PNG, JPEG, or BMP image.",
  importFileRead: "Couldn't read this image. Try another file.",
  importPixelateFailed: "Couldn't pixelate this image. Try a different file or size.",
  createProjectFailed: "Couldn't create a new project. Is the server running?",
  openProjectFailed:
    "Couldn't open this file. Is it a .pixelanea project?",
  saveProjectFailed: "Couldn't save the project. Check the path and try again.",
  invalidProjectPath: "Enter a path ending in .pixelanea",
  filePickerUnavailable:
    "No file picker is available. Install zenity for native dialogs or enter a path manually.",
  invalidCanvasSize: "Enter whole numbers between 1 and 512 for width and height.",
} as const;
