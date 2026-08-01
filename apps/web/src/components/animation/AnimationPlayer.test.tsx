import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { AnimationPlayer } from "./AnimationPlayer";

describe("AnimationPlayer", () => {
  beforeEach(() => {
    useEditorStore.setState({
      frameCount: 4,
      isPlaying: false,
      readOnly: false,
      animationFps: 8,
      animationLoop: true,
      projectId: "test-project",
      framePixelsByIndex: {
        0: new Uint8Array(4),
        1: new Uint8Array(4),
        2: new Uint8Array(4),
        3: new Uint8Array(4),
      },
      pixels: new Uint8Array(4),
      gridWidth: 2,
      gridHeight: 2,
    });
  });

  it("renders play, fps, and loop controls", () => {
    render(<AnimationPlayer />);
    expect(screen.getByLabelText(copy.animationPlay)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: copy.animationFps })).toBeInTheDocument();
    expect(screen.getByText(copy.animationLoop)).toBeInTheDocument();
    expect(screen.getByText(copy.animationFpsValue(8))).toBeInTheDocument();
  });

  it("toggles loop", () => {
    render(<AnimationPlayer />);
    fireEvent.click(screen.getByLabelText(copy.animationLoopOn));
    expect(useEditorStore.getState().animationLoop).toBe(false);
  });

  it("sets readOnly when play is toggled on", async () => {
    render(<AnimationPlayer />);
    fireEvent.click(screen.getByLabelText(copy.animationPlay));
    await waitFor(() => {
      expect(useEditorStore.getState().isPlaying).toBe(true);
    });
    expect(useEditorStore.getState().readOnly).toBe(true);
  });
});
