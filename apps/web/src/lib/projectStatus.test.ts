import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import {
  deriveProjectStatus,
  type ProjectStatusInput,
} from "./projectStatus";

function input(
  overrides: Partial<ProjectStatusInput> = {},
): ProjectStatusInput {
  return {
    hasProject: true,
    apiStatus: "connected",
    syncStatus: "idle",
    isDirty: false,
    isPaletteDirty: false,
    ...overrides,
  };
}

describe("deriveProjectStatus", () => {
  it("returns unsaved when frame is dirty and sync is idle", () => {
    expect(
      deriveProjectStatus(input({ isDirty: true, syncStatus: "idle" })),
    ).toEqual({ kind: "unsaved", label: copy.statusUnsaved });
  });

  it("returns saving when syncing and clean local flags", () => {
    expect(
      deriveProjectStatus(input({ syncStatus: "syncing" })),
    ).toEqual({ kind: "saving", label: copy.statusSaving });
  });

  it("returns saved when project loaded, connected, idle, clean", () => {
    expect(deriveProjectStatus(input())).toEqual({
      kind: "saved",
      label: copy.statusSaved,
    });
  });

  it("returns idle when disconnected so banner owns disconnect UX", () => {
    expect(
      deriveProjectStatus(
        input({
          isDirty: true,
          isPaletteDirty: true,
          syncStatus: "error",
          apiStatus: "disconnected",
        }),
      ),
    ).toEqual({ kind: "error", label: copy.statusSyncError });
  });

  it("returns idle without label when disconnected and no project", () => {
    expect(
      deriveProjectStatus(input({ hasProject: false, apiStatus: "disconnected" })),
    ).toEqual({ kind: "idle" });
  });

  it("returns error when sync failed while connected", () => {
    expect(
      deriveProjectStatus(input({ syncStatus: "error" })),
    ).toEqual({ kind: "error", label: copy.statusSyncError });
  });

  it("returns checking when api is checking", () => {
    expect(
      deriveProjectStatus(input({ apiStatus: "checking", syncStatus: "idle" })),
    ).toEqual({ kind: "checking" });
  });

  it("returns unsaved when only palette is dirty", () => {
    expect(
      deriveProjectStatus(input({ isPaletteDirty: true })),
    ).toEqual({ kind: "unsaved", label: copy.statusUnsaved });
  });

  it("prefers saving over unsaved while syncing", () => {
    expect(
      deriveProjectStatus(
        input({ isDirty: true, isPaletteDirty: true, syncStatus: "syncing" }),
      ),
    ).toEqual({ kind: "saving", label: copy.statusSaving });
  });

  it("prefers error over unsaved", () => {
    expect(
      deriveProjectStatus(input({ isDirty: true, syncStatus: "error" })),
    ).toEqual({ kind: "error", label: copy.statusSyncError });
  });

  it("returns idle when no project and connected/clean", () => {
    expect(deriveProjectStatus(input({ hasProject: false }))).toEqual({
      kind: "idle",
      label: copy.statusReady,
    });
  });

  it("prefers checking over disconnected-relevant dirty state", () => {
    expect(
      deriveProjectStatus(
        input({
          apiStatus: "checking",
          isDirty: true,
          syncStatus: "error",
        }),
      ),
    ).toEqual({ kind: "checking" });
  });
});
