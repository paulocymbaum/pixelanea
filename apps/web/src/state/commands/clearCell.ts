import { PaintCellsCommand } from "./paintCells";
import { TRANSPARENT_INDEX } from "./types";

/** Single-cell erase; delegates to PaintCellsCommand for undo and delta sync batching. */
export class ClearCellCommand extends PaintCellsCommand {
  constructor(x: number, y: number, previous: number) {
    super([{ x, y, previous, next: TRANSPARENT_INDEX }]);
  }
}
