import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import {
  flushFrameSync,
  flushPaletteSync,
  flushAllSync,
  schedulePaletteSync,
  setSyncCoordinatorForTests,
  SyncCoordinator,
} from "./persist";

vi.mock("@/api/frames", () => ({
  saveFrame: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/api/palette", () => ({
  savePalette: vi.fn().mockResolvedValue({ ok: true }),
}));

import { saveFrame } from "@/api/frames";
import { savePalette } from "@/api/palette";

describe("persist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncCoordinatorForTests(null);
    useEditorStore.setState({
      projectId: "test-project",
      gridWidth: 2,
      gridHeight: 2,
      pixels: new Uint8Array([0, 1, 2, 3]),
      paletteColors: ["#000000", "#FF0000"],
      isDirty: true,
      isPaletteDirty: false,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      syncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
      syncError: null,
    });
  });

  it("syncs dirty frame to backend", async () => {
    await flushFrameSync();

    expect(saveFrame).toHaveBeenCalledWith(
      "test-project",
      0,
      expect.any(Uint8Array),
    );
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("skips sync when not dirty", async () => {
    useEditorStore.setState({ isDirty: false });
    await flushFrameSync();
    expect(saveFrame).not.toHaveBeenCalled();
  });

  it("syncs dirty palette to backend", async () => {
    useEditorStore.setState({ isDirty: false, isPaletteDirty: true });
    await flushPaletteSync();

    expect(savePalette).toHaveBeenCalledWith("test-project", [
      "#000000",
      "#FF0000",
    ]);
    expect(useEditorStore.getState().isPaletteDirty).toBe(false);
  });

  it("flushAll syncs frame and palette lanes", async () => {
    useEditorStore.setState({ isPaletteDirty: true });
    await flushAllSync();

    expect(saveFrame).toHaveBeenCalledTimes(1);
    expect(savePalette).toHaveBeenCalledTimes(1);
  });

  it("serializes overlapping frame PUTs through coordinator", async () => {
    let resolveFirst: (() => void) | undefined;
    vi.mocked(saveFrame)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = () => resolve({ ok: true });
          }),
      )
      .mockResolvedValue({ ok: true });

    const flushPromise = flushFrameSync();
    useEditorStore.setState({
      pixels: new Uint8Array([9, 9, 9, 9]),
      isDirty: true,
    });
    const secondFlush = flushFrameSync();

    resolveFirst?.();
    await flushPromise;
    await secondFlush;

    expect(saveFrame).toHaveBeenCalledTimes(2);
    expect(saveFrame.mock.calls[1]?.[2]).toEqual(new Uint8Array([9, 9, 9, 9]));
  });

  it("schedulePaletteSync debounces palette writes", async () => {
    useEditorStore.setState({ isDirty: false, isPaletteDirty: true });

    const savePaletteMock = vi.fn().mockResolvedValue({ ok: true });
    const coordinator = new SyncCoordinator(
      {
        saveFrame: vi.fn(),
        savePalette: savePaletteMock,
        getFrameSnapshot: () => null,
        getPaletteSnapshot: () => ({
          lane: "palette",
          projectId: "test-project",
          colors: ["#000000", "#FF0000"],
        }),
        frameCallbacks: {
          onSyncing: vi.fn(),
          onSuccess: vi.fn(),
          onError: vi.fn(),
        },
        paletteCallbacks: {
          onSyncing: vi.fn(),
          onSuccess: vi.fn(),
          onError: vi.fn(),
        },
      },
      50,
    );
    setSyncCoordinatorForTests(coordinator);

    schedulePaletteSync();
    expect(savePaletteMock).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 60));
    await Promise.resolve();
    await Promise.resolve();

    expect(savePaletteMock).toHaveBeenCalledTimes(1);
  });
});
