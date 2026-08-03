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
      animationBoomerang: false,
      playbackDirection: 1,
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

  it("toggles boomerang and disables forward loop highlight", () => {
    render(<AnimationPlayer />);
    fireEvent.click(screen.getByLabelText(copy.animationBoomerangOff));
    expect(useEditorStore.getState().animationBoomerang).toBe(true);
    expect(useEditorStore.getState().animationLoop).toBe(true);
    expect(screen.getByLabelText(copy.animationBoomerangOn)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("sets readOnly when play is toggled on", async () => {
    render(<AnimationPlayer />);
    fireEvent.click(screen.getByLabelText(copy.animationPlay));
    await waitFor(() => {
      expect(useEditorStore.getState().isPlaying).toBe(true);
    });
    expect(useEditorStore.getState().readOnly).toBe(true);
  });

  it("shows onion skin opacity control when onion skin is enabled", () => {
    useEditorStore.setState({ onionSkinEnabled: true, onionSkinOpacity: 0.3 });
    render(<AnimationPlayer />);
    expect(
      screen.getByRole("slider", { name: copy.animationOnionSkinOpacity }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.animationOnionSkinOpacityValue(30))).toBeInTheDocument();
  });

  it("restarts play-once from frame 0 when already on the last frame", async () => {
    useEditorStore.setState({
      animationLoop: false,
      activeFrameIndex: 3,
      pixels: new Uint8Array(useEditorStore.getState().framePixelsByIndex[3]!),
    });

    render(<AnimationPlayer />);
    fireEvent.click(screen.getByLabelText(copy.animationPlay));

    await waitFor(() => {
      expect(useEditorStore.getState().isPlaying).toBe(true);
    });
    expect(useEditorStore.getState().activeFrameIndex).toBe(0);
  });
});
