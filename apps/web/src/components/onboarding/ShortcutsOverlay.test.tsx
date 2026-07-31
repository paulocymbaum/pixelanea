import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

describe("ShortcutsOverlay", () => {
  beforeEach(() => {
    useUiStore.setState({ shortcutsOverlayOpen: false });
  });

  it("renders when open", () => {
    useUiStore.setState({ shortcutsOverlayOpen: true });
    render(<ShortcutsOverlay />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(copy.shortcutsOverlayTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.shortcutPaint)).toBeInTheDocument();
    expect(screen.getByText(copy.shortcutUndo)).toBeInTheDocument();
  });

  it("closes via close button", () => {
    useUiStore.setState({ shortcutsOverlayOpen: true });
    render(<ShortcutsOverlay />);

    fireEvent.click(screen.getByText(copy.shortcutsOverlayClose));

    expect(useUiStore.getState().shortcutsOverlayOpen).toBe(false);
  });
});
