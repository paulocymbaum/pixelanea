import { cellIndex, type Command } from "./types";

export class PaintCellCommand implements Command {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly previous: number,
    readonly next: number,
  ) {}

  apply(pixels: Uint8Array, gridWidth: number): void {
    pixels[cellIndex(this.x, this.y, gridWidth)] = this.next;
  }

  revert(pixels: Uint8Array, gridWidth: number): void {
    pixels[cellIndex(this.x, this.y, gridWidth)] = this.previous;
  }
}
