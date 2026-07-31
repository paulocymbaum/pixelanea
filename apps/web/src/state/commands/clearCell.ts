import { PaintCellCommand } from "./paintCell";
import { TRANSPARENT_INDEX } from "./types";

export class ClearCellCommand extends PaintCellCommand {
  constructor(x: number, y: number, previous: number) {
    super(x, y, previous, TRANSPARENT_INDEX);
  }
}
