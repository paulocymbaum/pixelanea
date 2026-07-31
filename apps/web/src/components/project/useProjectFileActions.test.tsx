import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectFileActions } from "./useProjectFileActions";

const {
  saveProjectToBundleMock,
  flushAllSyncMock,
  showToastMock,
  editorState,
} = vi.hoisted(() => ({
  saveProjectToBundleMock: vi.fn(),
  flushAllSyncMock: vi.fn(),
  showToastMock: vi.fn(),
  editorState: {
    projectId: "project-1",
    bundlePath: "/tmp/current.pixelanea",
    assetType: "character" as const,
    frameCount: 1,
    setBundlePath: vi.fn(),
    setAssetType: vi.fn(),
    setSyncStatus: vi.fn(),
  },
}));

vi.mock("@/api/projects", () => ({
  openProjectFromBundle: vi.fn(),
  saveProjectToBundle: saveProjectToBundleMock,
}));

vi.mock("@/state/persist", () => ({
  flushAllSync: flushAllSyncMock,
}));

vi.mock("@/state/uiStore", () => ({
  useUiStore: (selector: (state: { showToast: typeof showToastMock }) => unknown) =>
    selector({ showToast: showToastMock }),
}));

vi.mock("@/state/editorStore", () => ({
  useEditorStore: (selector: (state: typeof editorState) => unknown) =>
    selector(editorState),
}));

vi.mock("@/hooks/useLoadProject", () => ({
  loadProjectIntoEditor: vi.fn(),
}));

vi.mock("./OverwriteConfirmDialog", () => ({
  OverwriteConfirmDialog: () => null,
}));

vi.mock("./ProjectPathDialog", () => ({
  ProjectPathDialog: () => null,
}));

describe("useProjectFileActions", () => {
  beforeEach(() => {
    saveProjectToBundleMock.mockReset();
    flushAllSyncMock.mockReset();
    showToastMock.mockReset();
    editorState.setBundlePath.mockReset();
    editorState.setAssetType.mockReset();
    editorState.setSyncStatus.mockReset();
    editorState.projectId = "project-1";
    editorState.bundlePath = "/tmp/current.pixelanea";
    editorState.assetType = "character";
    editorState.frameCount = 1;
    flushAllSyncMock.mockResolvedValue(undefined);
    saveProjectToBundleMock.mockResolvedValue({
      ok: true,
      path: "/tmp/current.pixelanea",
    });
  });

  it("passes current asset type when saving to existing bundle path", async () => {
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectToBundleMock).toHaveBeenCalledWith(
      "project-1",
      "/tmp/current.pixelanea",
      "character",
    );
  });

  it("updates store asset type after successful save with new type", async () => {
    editorState.assetType = "prop";
    saveProjectToBundleMock.mockResolvedValue({
      ok: true,
      path: "/tmp/prop.pixelanea",
    });

    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectToBundleMock).toHaveBeenCalledWith(
      "project-1",
      "/tmp/current.pixelanea",
      "prop",
    );
    expect(editorState.setAssetType).toHaveBeenCalledWith("prop");
  });
});
