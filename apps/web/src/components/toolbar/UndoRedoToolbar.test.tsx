import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { PaintCellCommand } from "@/state/commands/paintCell";
import { useEditorStore } from "@/state/editorStore";
import { UndoRedoToolbar } from "./UndoRedoToolbar";

describe("UndoRedoToolbar", () => {
  beforeEach(() => {
    useEditorStore.setState({
      readOnly: false,
      undoStack: [],
      redoStack: [],
      gridWidth: 2,
      pixels: new Uint8Array(4),
    });
  });

  it("renders undo and redo with icon labels", () => {
    render(<UndoRedoToolbar />);

    expect(
      screen.getByRole("toolbar", { name: copy.undoRedoToolbarLabel }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.undo })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.redo })).toBeInTheDocument();
  });

  it("disables undo and redo when stacks are empty", () => {
    render(<UndoRedoToolbar />);

    expect(screen.getByRole("button", { name: copy.undo })).toBeDisabled();
    expect(screen.getByRole("button", { name: copy.redo })).toBeDisabled();
  });

  it("undoes when undo is clicked", () => {
    const command = new PaintCellCommand(0, 0, 0, 2);
    useEditorStore.setState({
      undoStack: [command],
      pixels: new Uint8Array([2, 0, 0, 0]),
    });

    render(<UndoRedoToolbar />);

    fireEvent.click(screen.getByRole("button", { name: copy.undo }));

    expect(useEditorStore.getState().undoStack).toHaveLength(0);
    expect(useEditorStore.getState().pixels[0]).toBe(0);
  });

  it("disables actions when readOnly", () => {
    const command = new PaintCellCommand(0, 0, 0, 2);
    useEditorStore.setState({
      readOnly: true,
      undoStack: [command],
      redoStack: [command],
    });

    render(<UndoRedoToolbar />);

    expect(screen.getByRole("button", { name: copy.undo })).toBeDisabled();
    expect(screen.getByRole("button", { name: copy.redo })).toBeDisabled();
  });
});
