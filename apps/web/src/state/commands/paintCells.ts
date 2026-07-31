import { cellIndex, type Command } from "./types";

export type CellChange = {
  x: number;
  y: number;
  previous: number;
  next: number;
};

export class PaintCellsCommand implements Command {
  constructor(readonly changes: readonly CellChange[]) {}

  apply(pixels: Uint8Array, gridWidth: number): void {
    for (const change of this.changes) {
      pixels[cellIndex(change.x, change.y, gridWidth)] = change.next;
    }
  }

  revert(pixels: Uint8Array, gridWidth: number): void {
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const change = this.changes[i]!;
      pixels[cellIndex(change.x, change.y, gridWidth)] = change.previous;
    }
  }
}
