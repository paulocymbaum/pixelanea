import type { Command } from "@/state/commands/types";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { pushCommands } from "@/state/commands/undoStack";
import { writeFramePixels } from "@/state/frameCache";
import { scheduleFrameSync } from "@/state/persist";
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

type CommandStoreSlice = {
  readOnly: boolean;
  pixels: Uint8Array;
  gridWidth: number;
  framePixelsByIndex: Record<number, Uint8Array>;
  activeFrameIndex: number;
  undoStack: Command[];
  redoStack: Command[];
};

type CommandStoreSet = (
  partial:
    | Partial<
        CommandStoreSlice & {
          isDirty: boolean;
          bundleDirty: boolean;
          frameSyncStatus: import("./editorStoreSync").SyncStatus;
          frameSyncError: string | null;
        }
      >
    | ((state: CommandStoreSlice) => Partial<
        CommandStoreSlice & {
          isDirty: boolean;
          bundleDirty: boolean;
          frameSyncStatus: import("./editorStoreSync").SyncStatus;
          frameSyncError: string | null;
        }
      >),
) => void;

type CommandStoreGet = () => CommandStoreSlice;

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
