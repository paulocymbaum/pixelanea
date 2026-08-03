import type {
  FrameDeltaSnapshot,
  FrameSnapshot,
  PaletteSnapshot,
  ProjectSettingsSnapshot,
  SaveResult,
  SyncSnapshot,
} from "./types";
import { SYNC_DEBOUNCE_MS, syncKeyToString } from "./types";
import { logger } from "@/logging/logger";

type LaneCallbacks = {
  onSyncing: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
};

type LaneRuntime = {
  inFlight: boolean;
  pending: SyncSnapshot | null;
  epoch: number;
  idleWaiters: Array<() => void>;
};

export type SyncCoordinatorDeps = {
  saveFrame: (
    projectId: string,
    frameIndex: number,
    pixels: Uint8Array,
  ) => Promise<SaveResult>;
  saveFrameDelta?: (
    projectId: string,
    frameIndex: number,
    changes: readonly FrameDeltaSnapshot["changes"][number][],
  ) => Promise<SaveResult>;
  savePalette: (
    projectId: string,
    colors: readonly string[],
  ) => Promise<SaveResult>;
  saveProjectSettings: (
    projectId: string,
    settings: { fps: number; loop: boolean },
  ) => Promise<SaveResult>;
  frameCallbacks: LaneCallbacks;
  paletteCallbacks: LaneCallbacks;
  projectSettingsCallbacks: LaneCallbacks;
  getFrameSnapshot: () => FrameSnapshot | null;
  getFrameDeltaSnapshot?: () => FrameDeltaSnapshot | null;
  getPaletteSnapshot: () => PaletteSnapshot | null;
  getProjectSettingsSnapshot: () => ProjectSettingsSnapshot | null;
};

type DebounceKind = "frame" | "palette" | "projectSettings";

export class SyncCoordinator {
  private readonly lanes = new Map<string, LaneRuntime>();
  private readonly debounceTimers: Record<
    DebounceKind,
    ReturnType<typeof setTimeout> | null
  > = {
    frame: null,
    palette: null,
    projectSettings: null,
  };

  constructor(
    private readonly deps: SyncCoordinatorDeps,
    private readonly debounceMs: number = SYNC_DEBOUNCE_MS,
  ) {}

  scheduleFrame(): void {
    this.scheduleDebounce("frame", () => {
      const deltaSnapshot = this.deps.getFrameDeltaSnapshot?.() ?? null;
      if (deltaSnapshot) {
        this.enqueue(deltaSnapshot, this.deps.frameCallbacks);
        return;
      }

      const snapshot = this.deps.getFrameSnapshot();
      if (snapshot) {
        this.enqueue(snapshot, this.deps.frameCallbacks);
      }
    });
  }

  schedulePalette(): void {
    this.scheduleDebounce("palette", () => {
      const snapshot = this.deps.getPaletteSnapshot();
      if (snapshot) {
        this.enqueue(snapshot, this.deps.paletteCallbacks);
      }
    });
  }

  scheduleProjectSettings(): void {
    this.scheduleDebounce("projectSettings", () => {
      const snapshot = this.deps.getProjectSettingsSnapshot();
      if (snapshot) {
        this.enqueue(snapshot, this.deps.projectSettingsCallbacks);
      }
    });
  }

  cancelFrame(): void {
    this.cancelDebounce("frame");
  }

  cancelPalette(): void {
    this.cancelDebounce("palette");
  }

  cancelProjectSettings(): void {
    this.cancelDebounce("projectSettings");
  }

  async flushFrame(): Promise<void> {
    this.cancelDebounce("frame");
    const snapshot =
      this.deps.getFrameDeltaSnapshot?.() ?? this.deps.getFrameSnapshot();
    if (snapshot) {
      this.enqueue(snapshot, this.deps.frameCallbacks);
    }
    await this.waitForLaneIdle(snapshot);
  }

  async flushPalette(): Promise<void> {
    this.cancelDebounce("palette");
    const snapshot = this.deps.getPaletteSnapshot();
    if (snapshot) {
      this.enqueue(snapshot, this.deps.paletteCallbacks);
    }
    await this.waitForLaneIdle(snapshot);
  }

  async flushProjectSettings(): Promise<void> {
    const snapshot = this.deps.getProjectSettingsSnapshot();
    if (snapshot) {
      this.enqueue(snapshot, this.deps.projectSettingsCallbacks);
    }
    await this.waitForLaneIdle(snapshot);
  }

  async flushAll(): Promise<void> {
    this.cancelDebounce("frame");
    this.cancelDebounce("palette");
    this.cancelDebounce("projectSettings");

    const frameDeltaSnapshot = this.deps.getFrameDeltaSnapshot?.() ?? null;
    const frameSnapshot = frameDeltaSnapshot ?? this.deps.getFrameSnapshot();
    const paletteSnapshot = this.deps.getPaletteSnapshot();
    const settingsSnapshot = this.deps.getProjectSettingsSnapshot();

    if (frameSnapshot) {
      this.enqueue(frameSnapshot, this.deps.frameCallbacks);
    }
    if (paletteSnapshot) {
      this.enqueue(paletteSnapshot, this.deps.paletteCallbacks);
    }
    if (settingsSnapshot) {
      this.enqueue(settingsSnapshot, this.deps.projectSettingsCallbacks);
    }

    await Promise.all([
      this.waitForLaneIdle(frameSnapshot),
      this.waitForLaneIdle(paletteSnapshot),
      this.waitForLaneIdle(settingsSnapshot),
    ]);
  }

  reset(): void {
    this.cancelDebounce("frame");
    this.cancelDebounce("palette");
    this.cancelDebounce("projectSettings");

    for (const lane of this.lanes.values()) {
      lane.epoch += 1;
      lane.pending = null;
      this.resolveIdleWaiters(lane);
    }
  }

  private scheduleDebounce(kind: DebounceKind, run: () => void): void {
    const timer = this.debounceTimers[kind];
    if (timer) {
      clearTimeout(timer);
    }

    this.debounceTimers[kind] = setTimeout(() => {
      this.debounceTimers[kind] = null;
      run();
    }, this.debounceMs);
  }

  private cancelDebounce(kind: DebounceKind): void {
    const timer = this.debounceTimers[kind];
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers[kind] = null;
    }
  }

  private laneFor(snapshot: SyncSnapshot): LaneRuntime {
    const key = syncKeyToString(snapshot);
    let lane = this.lanes.get(key);
    if (!lane) {
      lane = {
        inFlight: false,
        pending: null,
        epoch: 0,
        idleWaiters: [],
      };
      this.lanes.set(key, lane);
    }
    return lane;
  }

  private enqueue(snapshot: SyncSnapshot, callbacks: LaneCallbacks): void {
    const lane = this.laneFor(snapshot);

    if (lane.inFlight) {
      lane.pending = snapshot;
      return;
    }

    void this.runLane(snapshot, lane, callbacks);
  }

  private async runLane(
    snapshot: SyncSnapshot,
    lane: LaneRuntime,
    callbacks: LaneCallbacks,
  ): Promise<void> {
    lane.inFlight = true;
    const epochAtStart = lane.epoch;
    callbacks.onSyncing();

    const result = await this.persistSnapshot(snapshot);

    if (lane.epoch !== epochAtStart) {
      logger.warn("sync", "stale_save_result_dropped", {
        lane: snapshot.lane,
        projectId: snapshot.projectId,
        epochAtStart,
        currentEpoch: lane.epoch,
        ...(snapshot.lane === "frame" || snapshot.lane === "frameDelta"
          ? { frameIndex: snapshot.frameIndex }
          : {}),
      });
      lane.inFlight = false;
      lane.pending = null;
      this.resolveIdleWaiters(lane);
      return;
    }

    if (!result.ok) {
      logger.error("sync", `${snapshot.lane}_save_failed`, {
        projectId: snapshot.projectId,
        message: result.message,
        ...(snapshot.lane === "frame" || snapshot.lane === "frameDelta"
          ? { frameIndex: snapshot.frameIndex }
          : {}),
      });
      lane.inFlight = false;
      lane.pending = null;
      callbacks.onError(result.message);
      this.resolveIdleWaiters(lane);
      return;
    }

    if (lane.pending) {
      const next = lane.pending;
      lane.pending = null;
      await this.runLane(next, lane, callbacks);
      return;
    }

    lane.inFlight = false;
    callbacks.onSuccess();
    this.resolveIdleWaiters(lane);
  }

  private async persistSnapshot(snapshot: SyncSnapshot): Promise<SaveResult> {
    if (snapshot.lane === "frameDelta") {
      if (!this.deps.saveFrameDelta) {
        const fullSnapshot = this.deps.getFrameSnapshot();
        if (!fullSnapshot) {
          return { ok: false, message: "delta sync unavailable" };
        }
        return this.deps.saveFrame(
          fullSnapshot.projectId,
          fullSnapshot.frameIndex,
          fullSnapshot.pixels,
        );
      }

      const deltaResult = await this.deps.saveFrameDelta(
        snapshot.projectId,
        snapshot.frameIndex,
        snapshot.changes,
      );
      if (deltaResult.ok) {
        return deltaResult;
      }

      logger.warn("sync", "frame_delta_fallback_to_full_put", {
        projectId: snapshot.projectId,
        frameIndex: snapshot.frameIndex,
        message: deltaResult.message,
        changeCount: snapshot.changes.length,
      });

      const fullSnapshot = this.deps.getFrameSnapshot();
      if (!fullSnapshot) {
        return deltaResult;
      }

      return this.deps.saveFrame(
        fullSnapshot.projectId,
        fullSnapshot.frameIndex,
        fullSnapshot.pixels,
      );
    }

    if (snapshot.lane === "frame") {
      return this.deps.saveFrame(
        snapshot.projectId,
        snapshot.frameIndex,
        snapshot.pixels,
      );
    }

    if (snapshot.lane === "palette") {
      return this.deps.savePalette(snapshot.projectId, snapshot.colors);
    }

    return this.deps.saveProjectSettings(snapshot.projectId, {
      fps: snapshot.fps,
      loop: snapshot.loop,
    });
  }

  private async waitForLaneIdle(snapshot: SyncSnapshot | null): Promise<void> {
    if (!snapshot) {
      return;
    }

    const key = syncKeyToString(snapshot);
    const runtime = this.lanes.get(key);
    if (!runtime || (!runtime.inFlight && !runtime.pending)) {
      return;
    }

    await new Promise<void>((resolve) => {
      runtime.idleWaiters.push(resolve);
    });

    if (runtime.inFlight || runtime.pending) {
      await this.waitForLaneIdle(snapshot);
    }
  }

  private resolveIdleWaiters(lane: LaneRuntime): void {
    if (lane.inFlight || lane.pending) {
      return;
    }

    const waiters = lane.idleWaiters.splice(0);
    for (const resolve of waiters) {
      resolve();
    }
  }
}
