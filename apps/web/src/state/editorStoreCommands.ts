import type { Command } from "@/state/commands/types";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import {
  isSetPaletteColorsCommand,
} from "@/state/commands/setPaletteColors";
import { pushCommands } from "@/state/commands/undoStack";
import { writeFramePixels } from "@/state/frameCache";
import { scheduleFrameSync, schedulePaletteSync } from "@/state/persist";
import {
  appendPendingCellChanges,
  clearPendingCellChanges,
} from "@/state/sync/pendingCellChanges";

export function applyCommands(
  pixels: Uint8Array,
  gridWidth: number,
  commands: Command[],
  direction: "apply" | "revert",
): void {
  for (const command of commands) {
    if (direction === "apply") {
      command.apply(pixels, gridWidth);
    } else {
      command.revert(pixels, gridWidth);
    }
  }
}

export type CommandStoreSlice = {
  readOnly: boolean;
  pixels: Uint8Array;
  gridWidth: number;
  paletteColors: readonly string[];
  activeColorIndex: number;
  framePixelsByIndex: Record<number, Uint8Array>;
  activeFrameIndex: number;
  undoStack: Command[];
  redoStack: Command[];
};

export type CommandStoreGet = () => CommandStoreSlice;
export type CommandStoreSet = (
  partial:
    | Partial<
        CommandStoreSlice & {
          isDirty: boolean;
          bundleDirty: boolean;
          isPaletteDirty: boolean;
          frameSyncStatus: import("./editorStoreSync").SyncStatus;
          paletteSyncStatus: import("./editorStoreSync").SyncStatus;
          frameSyncError: string | null;
          paletteSyncError: string | null;
        }
      >
    | ((state: CommandStoreSlice) => Partial<
        CommandStoreSlice & {
          isDirty: boolean;
          bundleDirty: boolean;
          isPaletteDirty: boolean;
          frameSyncStatus: import("./editorStoreSync").SyncStatus;
          paletteSyncStatus: import("./editorStoreSync").SyncStatus;
          frameSyncError: string | null;
          paletteSyncError: string | null;
        }
      >),
) => void;

export function dispatchCommands(
  get: CommandStoreGet,
  set: CommandStoreSet,
  commandOrCommands: Command | Command[],
): void {
  const commands = Array.isArray(commandOrCommands)
    ? commandOrCommands
    : [commandOrCommands];
  if (commands.length === 0) {
    return;
  }

  const state = get();
  if (state.readOnly) {
    return;
  }

  if (commands.every(isSetPaletteColorsCommand)) {
    let paletteState = {
      paletteColors: state.paletteColors,
      activeColorIndex: state.activeColorIndex,
    };
    for (const command of commands) {
      paletteState = command.paletteApplyState();
    }

    set({
      ...paletteState,
      undoStack: pushCommands(state.undoStack, commands),
      redoStack: [],
      isPaletteDirty: true,
      bundleDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
    });
    clearPendingCellChanges();
    schedulePaletteSync();
    return;
  }

  const pixels = new Uint8Array(state.pixels);
  applyCommands(pixels, state.gridWidth, commands, "apply");

  set({
    pixels,
    framePixelsByIndex: writeFramePixels(
      state.framePixelsByIndex,
      state.activeFrameIndex,
      pixels,
    ),
    undoStack: pushCommands(state.undoStack, commands),
    redoStack: [],
    isDirty: true,
    bundleDirty: true,
    frameSyncStatus: "idle",
    frameSyncError: null,
  });

  for (const command of commands) {
    if (command instanceof PaintCellsCommand) {
      appendPendingCellChanges(command.changes);
    } else {
      clearPendingCellChanges();
    }
  }

  scheduleFrameSync();
}

export function undoCommand(get: CommandStoreGet, set: CommandStoreSet): void {
  const state = get();
  if (state.readOnly || state.undoStack.length === 0) {
    return;
  }

  clearPendingCellChanges();

  const command = state.undoStack[state.undoStack.length - 1]!;

  if (isSetPaletteColorsCommand(command)) {
    set({
      ...command.paletteRevertState(),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, command],
      isPaletteDirty: true,
      bundleDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
    });
    clearPendingCellChanges();
    schedulePaletteSync();
    return;
  }

  const pixels = new Uint8Array(state.pixels);
  command.revert(pixels, state.gridWidth);

  set({
    pixels,
    framePixelsByIndex: writeFramePixels(
      state.framePixelsByIndex,
      state.activeFrameIndex,
      pixels,
    ),
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, command],
    isDirty: true,
    bundleDirty: true,
    frameSyncStatus: "idle",
    frameSyncError: null,
  });

  scheduleFrameSync();
}

export function redoCommand(get: CommandStoreGet, set: CommandStoreSet): void {
  const state = get();
  if (state.readOnly || state.redoStack.length === 0) {
    return;
  }

  clearPendingCellChanges();

  const command = state.redoStack[state.redoStack.length - 1]!;

  if (isSetPaletteColorsCommand(command)) {
    set({
      ...command.paletteApplyState(),
      undoStack: pushCommands(state.undoStack, [command]),
      redoStack: state.redoStack.slice(0, -1),
      isPaletteDirty: true,
      bundleDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
    });
    clearPendingCellChanges();
    schedulePaletteSync();
    return;
  }

  const pixels = new Uint8Array(state.pixels);
  command.apply(pixels, state.gridWidth);

  set({
    pixels,
    framePixelsByIndex: writeFramePixels(
      state.framePixelsByIndex,
      state.activeFrameIndex,
      pixels,
    ),
    undoStack: pushCommands(state.undoStack, [command]),
    redoStack: state.redoStack.slice(0, -1),
    isDirty: true,
    bundleDirty: true,
    frameSyncStatus: "idle",
    frameSyncError: null,
  });

  scheduleFrameSync();
}
