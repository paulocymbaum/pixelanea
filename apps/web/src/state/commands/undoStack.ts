import type { Command } from "./types";
import { UNDO_STACK_CAP } from "./types";

export function pushCommands(
  stack: Command[],
  commands: Command[],
): Command[] {
  if (commands.length === 0) {
    return stack;
  }
  const next = [...stack, ...commands];
  if (next.length <= UNDO_STACK_CAP) {
    return next;
  }
  return next.slice(next.length - UNDO_STACK_CAP);
}
