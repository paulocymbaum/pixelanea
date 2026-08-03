import { normalizeHex } from "@/state/paletteUtils";
import type { Command } from "./types";

/** Replaces the project palette; undoable via the editor command stack. */
export class SetPaletteColorsCommand implements Command {
  readonly previousColors: readonly string[];
  readonly previousActiveIndex: number;
  readonly nextColors: readonly string[];
  readonly nextActiveIndex: number;

  constructor(
    previousColors: readonly string[],
    previousActiveIndex: number,
    nextColors: readonly string[],
  ) {
    this.previousColors = previousColors;
    this.previousActiveIndex = previousActiveIndex;
    this.nextColors = nextColors.map((hex) => normalizeHex(hex) ?? hex);
    this.nextActiveIndex = Math.min(
      Math.max(previousActiveIndex, 0),
      Math.max(this.nextColors.length - 1, 0),
    );
  }

  apply(): void {}

  revert(): void {}

  paletteApplyState(): {
    paletteColors: readonly string[];
    activeColorIndex: number;
  } {
    return {
      paletteColors: this.nextColors,
      activeColorIndex: this.nextActiveIndex,
    };
  }

  paletteRevertState(): {
    paletteColors: readonly string[];
    activeColorIndex: number;
  } {
    return {
      paletteColors: this.previousColors,
      activeColorIndex: this.previousActiveIndex,
    };
  }
}

export function isSetPaletteColorsCommand(
  command: Command,
): command is SetPaletteColorsCommand {
  return command instanceof SetPaletteColorsCommand;
}
