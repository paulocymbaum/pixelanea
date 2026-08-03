import { describe, expect, it, vi } from "vitest";
import { SyncCoordinator } from "./syncCoordinator";
import type {
  FrameDeltaSnapshot,
  FrameSnapshot,
  PaletteSnapshot,
  ProjectSettingsSnapshot,
} from "./types";

function frameDeltaSnapshot(
  projectId: string,
  frameIndex: number,
): FrameDeltaSnapshot {
  return {
    lane: "frameDelta",
    projectId,
    frameIndex,
    changes: [{ x: 0, y: 0, previous: 0, next: 2 }],
  };
}

function frameSnapshot(
  projectId: string,
  frameIndex: number,
  fill: number,
): FrameSnapshot {
  return {
    lane: "frame",
    projectId,
    frameIndex,
    pixels: new Uint8Array([fill, fill, fill, fill]),
  };
}

function paletteSnapshot(projectId: string, colors: string[]): PaletteSnapshot {
  return {
    lane: "palette",
    projectId,
    colors,
  };
}

function projectSettingsSnapshot(
  projectId: string,
  fps: number,
  loop: boolean,
): ProjectSettingsSnapshot {
  return { lane: "projectSettings", projectId, fps, loop };
}

function createCoordinator(
  overrides: Partial<ConstructorParameters<typeof SyncCoordinator>[0]> = {},
  debounceMs = 0,
) {
  return new SyncCoordinator(
    {
      saveFrame: vi.fn().mockResolvedValue({ ok: true }),
      saveFrameDelta: vi.fn().mockResolvedValue({ ok: true }),
      savePalette: vi.fn().mockResolvedValue({ ok: true }),
      saveProjectSettings: vi.fn().mockResolvedValue({ ok: true }),
      getFrameSnapshot: () => null,
      getFrameDeltaSnapshot: () => null,
      getPaletteSnapshot: () => null,
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
      ...overrides,
    },
    debounceMs,
  );
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("SyncCoordinator", () => {
  it("debounces frame schedule before enqueueing", async () => {
    const saveFrame = vi.fn().mockResolvedValue({ ok: true });
    let snapshot = frameSnapshot("p1", 0, 1);

    const coordinator = createCoordinator(
      {
        saveFrame,
        getFrameSnapshot: () => snapshot,
      },
      50,
    );

    coordinator.scheduleFrame();
    snapshot = frameSnapshot("p1", 0, 2);
    coordinator.scheduleFrame();

    expect(saveFrame).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 60));
    await flushPromises();

    expect(saveFrame).toHaveBeenCalledTimes(1);
    expect(saveFrame.mock.calls[0]?.[2]).toEqual(new Uint8Array([2, 2, 2, 2]));
  });

  it("coalesces pending snapshot while a PUT is in flight", async () => {
    let resolveFirst: ((value: { ok: true }) => void) | undefined;
    const saveFrame = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: true }>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue({ ok: true });

    let snapshot: FrameSnapshot | null = frameSnapshot("p1", 0, 1);
    const onSuccess = vi.fn();

    const coordinator = createCoordinator({
      saveFrame,
      getFrameSnapshot: () => snapshot,
      frameCallbacks: {
        onSyncing: vi.fn(),
        onSuccess,
        onError: vi.fn(),
      },
    });

    const firstFlush = coordinator.flushFrame();
    expect(saveFrame).toHaveBeenCalledTimes(1);

    snapshot = frameSnapshot("p1", 0, 9);
    const secondFlush = coordinator.flushFrame();

    resolveFirst?.({ ok: true });
    await Promise.all([firstFlush, secondFlush]);
    await flushPromises();

    expect(saveFrame).toHaveBeenCalledTimes(2);
    expect(saveFrame.mock.calls[1]?.[2]).toEqual(new Uint8Array([9, 9, 9, 9]));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("flush drains pending coalesced writes", async () => {
    const saveFrame = vi.fn().mockResolvedValue({ ok: true });
    const snapshot = frameSnapshot("p1", 0, 7);

    const coordinator = createCoordinator({
      saveFrame,
      getFrameSnapshot: () => snapshot,
    });

    await coordinator.flushFrame();

    expect(saveFrame).toHaveBeenCalledTimes(1);
  });

  it("reset ignores in-flight completion", async () => {
    let resolvePut: ((value: { ok: true }) => void) | undefined;
    const saveFrame = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise<{ ok: true }>((resolve) => {
            resolvePut = resolve;
          }),
      );
    const onSuccess = vi.fn();

    const coordinator = createCoordinator({
      saveFrame,
      getFrameSnapshot: () => frameSnapshot("p1", 0, 1),
      frameCallbacks: {
        onSyncing: vi.fn(),
        onSuccess,
        onError: vi.fn(),
      },
    });

    const flushPromise = coordinator.flushFrame();
    coordinator.reset();
    resolvePut?.({ ok: true });
    await flushPromise;
    await flushPromises();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("flushAll runs frame, palette, and project settings lanes in parallel", async () => {
    const saveFrame = vi.fn().mockResolvedValue({ ok: true });
    const savePalette = vi.fn().mockResolvedValue({ ok: true });
    const saveProjectSettings = vi.fn().mockResolvedValue({ ok: true });

    const coordinator = createCoordinator({
      saveFrame,
      savePalette,
      saveProjectSettings,
      getFrameSnapshot: () => frameSnapshot("p1", 0, 1),
      getPaletteSnapshot: () => paletteSnapshot("p1", ["#112233"]),
      getProjectSettingsSnapshot: () => projectSettingsSnapshot("p1", 12, false),
    });

    await coordinator.flushAll();

    expect(saveFrame).toHaveBeenCalledTimes(1);
    expect(savePalette).toHaveBeenCalledTimes(1);
    expect(saveProjectSettings).toHaveBeenCalledWith("p1", {
      fps: 12,
      loop: false,
    });
  });

  it("flushProjectSettings waits for the write to land", async () => {
    let resolveSave: ((value: { ok: true }) => void) | undefined;
    const saveProjectSettings = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onSuccess = vi.fn();

    const coordinator = createCoordinator({
      saveProjectSettings,
      getProjectSettingsSnapshot: () => projectSettingsSnapshot("p1", 24, true),
      projectSettingsCallbacks: {
        onSyncing: vi.fn(),
        onSuccess,
        onError: vi.fn(),
      },
    });

    const flushPromise = coordinator.flushProjectSettings();
    expect(onSuccess).not.toHaveBeenCalled();

    resolveSave?.({ ok: true });
    await flushPromise;

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("prefers delta lane when a small change set is pending", async () => {
    const saveFrame = vi.fn().mockResolvedValue({ ok: true });
    const saveFrameDelta = vi.fn().mockResolvedValue({ ok: true });
    const delta = frameDeltaSnapshot("p1", 0);

    const coordinator = createCoordinator({
      saveFrame,
      saveFrameDelta,
      getFrameDeltaSnapshot: () => delta,
      getFrameSnapshot: () => frameSnapshot("p1", 0, 9),
    });

    await coordinator.flushFrame();

    expect(saveFrameDelta).toHaveBeenCalledTimes(1);
    expect(saveFrameDelta.mock.calls[0]?.[2]).toEqual(delta.changes);
    expect(saveFrame).not.toHaveBeenCalled();
  });

  it("falls back to full PUT when delta save fails", async () => {
    const saveFrame = vi.fn().mockResolvedValue({ ok: true });
    const saveFrameDelta = vi.fn().mockResolvedValue({ ok: false, message: "conflict" });
    const full = frameSnapshot("p1", 0, 5);
    const delta = frameDeltaSnapshot("p1", 0);

    const coordinator = createCoordinator({
      saveFrame,
      saveFrameDelta,
      getFrameDeltaSnapshot: () => delta,
      getFrameSnapshot: () => full,
    });

    await coordinator.flushFrame();

    expect(saveFrameDelta).toHaveBeenCalledTimes(1);
    expect(saveFrame).toHaveBeenCalledTimes(1);
    expect(saveFrame.mock.calls[0]?.[2]).toEqual(full.pixels);
  });
});
