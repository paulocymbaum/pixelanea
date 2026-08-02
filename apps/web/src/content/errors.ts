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
  bundleChecksumMismatch:
    "This project file looks damaged. Try a backup or re-save from Pixelanea.",
  bundleUnsafeEntry:
    "This project file isn't safe to open. Try another copy or re-save.",
  bundleWriteFailed:
    "Couldn't write the project file. Check the folder permissions and try again.",
  projectAlreadyOpen: "This project is already open.",
  exportGifInsufficientFrames:
    "Need at least two frames to export a GIF. Duplicate frames first.",
  exportGifFailed: "Couldn't export the animation. Try again after saving.",
  filePickerUnavailable:
    "No file picker is available. Install zenity for native dialogs or enter a path manually.",
  invalidCanvasSize: "Enter whole numbers between 1 and 512 for width and height.",
} as const;
