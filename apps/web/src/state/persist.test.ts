import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import {
  flushFrameSync,
  flushPaletteSync,
  flushAllSync,
  markProjectSettingsSynced,
  resetPersistState,
  schedulePaletteSync,
  scheduleProjectSettingsSync,
  setSyncCoordinatorForTests,
  SyncCoordinator,
} from "./persist";

vi.mock("@/api/frames", () => ({
  saveFrame: vi.fn().mockResolvedValue({ ok: true }),
  saveFrameCells: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/api/palette", () => ({
  savePalette: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/api/projects", () => ({
  updateProjectSettings: vi.fn().mockResolvedValue({ ok: true }),
}));

import { saveFrame, saveFrameCells } from "@/api/frames";
import { savePalette } from "@/api/palette";
import { updateProjectSettings } from "@/api/projects";
import { PaintCellsCommand } from "@/state/commands/paintCells";

describe("persist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncCoordinatorForTests(null);
    resetPersistState();
    useEditorStore.setState({
      projectId: "test-project",
      animationFps: 8,
      animationLoop: true,
      gridWidth: 2,
      gridHeight: 2,
      pixels: new Uint8Array([0, 1, 2, 3]),
      paletteColors: ["#000000", "#FF0000"],
      isDirty: true,
      isPaletteDirty: false,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
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

  it("flushAll syncs frame, palette, and animation settings", async () => {
    useEditorStore.setState({
      isPaletteDirty: true,
      animationFps: 12,
      animationLoop: false,
    });
    await flushAllSync();

    expect(saveFrame).toHaveBeenCalledTimes(1);
    expect(savePalette).toHaveBeenCalledTimes(1);
    expect(updateProjectSettings).toHaveBeenCalledWith("test-project", {
      fps: 12,
      loop: false,
    });
  });

  it("flushAll skips settings the server already holds", async () => {
    markProjectSettingsSynced("test-project", { fps: 8, loop: true });
    await flushAllSync();

    expect(updateProjectSettings).not.toHaveBeenCalled();
  });

  it("flushAll writes settings again once they change", async () => {
    markProjectSettingsSynced("test-project", { fps: 8, loop: true });
    // Animation settings can be written straight into the store, so the lane
    // has to notice the change without a dirty flag.
    useEditorStore.setState({ animationLoop: false });
    await flushAllSync();

    expect(updateProjectSettings).toHaveBeenCalledWith("test-project", {
      fps: 8,
      loop: false,
    });
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
        saveProjectSettings: vi.fn().mockResolvedValue({ ok: true }),
        getFrameSnapshot: () => null,
        getPaletteSnapshot: () => ({
          lane: "palette",
          projectId: "test-project",
          colors: ["#000000", "#FF0000"],
        }),
        getProjectSettingsSnapshot: () => null,
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
        projectSettingsCallbacks: {
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

  it("syncs small edits via frame cell delta when pending changes exist", async () => {
    useEditorStore.getState().dispatch(
      new PaintCellsCommand([{ x: 0, y: 0, previous: 0, next: 1 }]),
    );

    await flushFrameSync();

    expect(saveFrameCells).toHaveBeenCalledWith("test-project", 0, [
      { x: 0, y: 0, previous: 0, next: 1 },
    ]);
    expect(saveFrame).not.toHaveBeenCalled();
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("falls back to full frame PUT when delta exceeds cell threshold", async () => {
    const changes = Array.from({ length: 65 }, (_, i) => ({
      x: i % 2,
      y: Math.floor(i / 2),
      previous: 0,
      next: 1,
    }));
    useEditorStore.getState().dispatch(new PaintCellsCommand(changes));

    await flushFrameSync();

    expect(saveFrameCells).not.toHaveBeenCalled();
    expect(saveFrame).toHaveBeenCalledWith(
      "test-project",
      0,
      expect.any(Uint8Array),
    );
  });

  it("setAnimationFps debounces project settings sync", async () => {
    vi.useFakeTimers();
    markProjectSettingsSynced("test-project", { fps: 8, loop: true });

    useEditorStore.getState().setAnimationFps(12);

    expect(updateProjectSettings).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    expect(updateProjectSettings).toHaveBeenCalledWith("test-project", {
      fps: 12,
      loop: true,
    });
    vi.useRealTimers();
  });

  it("setAnimationLoop debounces project settings sync", async () => {
    vi.useFakeTimers();
    markProjectSettingsSynced("test-project", { fps: 8, loop: true });

    useEditorStore.getState().setAnimationLoop(false);

    expect(updateProjectSettings).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    expect(updateProjectSettings).toHaveBeenCalledWith("test-project", {
      fps: 8,
      loop: false,
    });
    vi.useRealTimers();
  });

  it("debounces project settings sync", async () => {
    const saveSettingsMock = vi.fn().mockResolvedValue({ ok: true });
    const coordinator = new SyncCoordinator(
      {
        saveFrame: vi.fn().mockResolvedValue({ ok: true }),
        savePalette: vi.fn().mockResolvedValue({ ok: true }),
        saveProjectSettings: saveSettingsMock,
        getFrameSnapshot: () => null,
        getPaletteSnapshot: () => null,
        getProjectSettingsSnapshot: () => ({
          lane: "projectSettings",
          projectId: "test-project",
          fps: 12,
          loop: false,
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
        projectSettingsCallbacks: {
          onSyncing: vi.fn(),
          onSuccess: vi.fn(),
          onError: vi.fn(),
        },
      },
      50,
    );
    setSyncCoordinatorForTests(coordinator);

    scheduleProjectSettingsSync();
    expect(saveSettingsMock).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 60));
    await Promise.resolve();
    await Promise.resolve();

    expect(saveSettingsMock).toHaveBeenCalledTimes(1);
    expect(saveSettingsMock).toHaveBeenCalledWith("test-project", {
      fps: 12,
      loop: false,
    });
  });
});
