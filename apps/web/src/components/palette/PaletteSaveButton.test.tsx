import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import * as persist from "@/state/persist";
import { PaletteSaveButton } from "./PaletteSaveButton";

describe("PaletteSaveButton", () => {
  beforeEach(() => {
    useEditorStore.setState({
      isPaletteDirty: false,
      paletteLocked: false,
      syncStatus: "idle",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is disabled when palette is not dirty", () => {
    render(<PaletteSaveButton />);
    expect(
      screen.getByRole("button", { name: copy.paletteSavePalette }),
    ).toBeDisabled();
  });

  it("persists palette when clicked and dirty", () => {
    const flushSpy = vi
      .spyOn(persist, "flushPaletteSync")
      .mockResolvedValue(undefined);
    useEditorStore.setState({ isPaletteDirty: true });

    render(<PaletteSaveButton />);
    fireEvent.click(
      screen.getByRole("button", { name: copy.paletteSavePalette }),
    );

    expect(flushSpy).toHaveBeenCalledOnce();
  });

  it("is disabled when palette is locked", () => {
    useEditorStore.setState({ isPaletteDirty: true, paletteLocked: true });
    render(<PaletteSaveButton />);
    expect(
      screen.getByRole("button", { name: copy.paletteSavePalette }),
    ).toBeDisabled();
  });
});
